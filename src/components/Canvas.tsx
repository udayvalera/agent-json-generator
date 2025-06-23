import React, { useRef, useState, useCallback, useLayoutEffect } from 'react';
import { WorkflowNode } from './WorkflowNode';
import { ConnectionLine } from './ConnectionLine';
import { AgentNode, ConnectionInProgress } from '../types/workflow';

// A type for our map of terminal positions
type TerminalPositionMap = Map<string, { x: number; y: number }>;

interface CanvasProps {
  nodes: AgentNode[];
  selectedNodeId: string | null;
  startNodeId: string;
  onNodeClick: (nodeId: string) => void;
  onNodeDelete: (nodeId: string) => void;
  onNodeDrop: (position: { x: number; y: number }, nodeType: 'conversational' | 'tool_execution') => void;
  onSetStartNode: (nodeId: string) => void;
  onNodeUpdate: (updatedNode: AgentNode) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  nodes,
  selectedNodeId,
  startNodeId,
  onNodeClick,
  onNodeDelete,
  onNodeDrop,
  onSetStartNode,
  onNodeUpdate
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [connectionInProgress, setConnectionInProgress] = useState<ConnectionInProgress | null>(null);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggedNode, setDraggedNode] = useState<{ nodeId: string; offset: { x: number; y: number } } | null>(null);
  
  // State to hold the measured positions of all terminals
  const [terminalPositions, setTerminalPositions] = useState<TerminalPositionMap>(new Map());
  // Ref to hold the actual DOM elements of the terminals
  const terminalElements = useRef<Map<string, HTMLElement | null>>(new Map());

  // Callback ref function to register a terminal element
  const registerTerminal = (key: string, el: HTMLElement | null) => {
    if (el) {
        terminalElements.current.set(key, el);
    } else {
        terminalElements.current.delete(key);
    }
  };
  
  // This effect measures the real position of each terminal after every render/pan
  useLayoutEffect(() => {
    const newPositions: TerminalPositionMap = new Map();
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    terminalElements.current.forEach((el, key) => {
      if (el) {
        const rect = el.getBoundingClientRect();
        // Calculate center position relative to the canvas's content area
        const x = rect.left - canvasRect.left + rect.width / 2 - canvasOffset.x;
        const y = rect.top - canvasRect.top + rect.height / 2 - canvasOffset.y;
        newPositions.set(key, { x, y });
      }
    });

    setTerminalPositions(newPositions);
  }, [nodes, canvasOffset, draggedNode, selectedNodeId]); // Re-calculate on node changes, pan, or drag

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!canvasRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const position = {
      x: e.clientX - rect.left - canvasOffset.x - 128, // Center the node and account for canvas offset
      y: e.clientY - rect.top - canvasOffset.y - 80
    };

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      onNodeDrop(position, data.nodeType);
    } catch (error) {
      console.error('Failed to parse drop data:', error);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setIsDraggingCanvas(true);
      setDragStart({ x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y });
      e.preventDefault();
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDraggingCanvas) {
      const newOffset = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      };
      setCanvasOffset(newOffset);
    } else if (draggedNode) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const newPosition = {
          x: e.clientX - rect.left - canvasOffset.x - draggedNode.offset.x,
          y: e.clientY - rect.top - canvasOffset.y - draggedNode.offset.y
        };
        
        const node = nodes.find(n => n.id === draggedNode.nodeId);
        if (node) {
          onNodeUpdate({
            ...node,
            position: newPosition
          });
        }
      }
    } else if (connectionInProgress) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        setConnectionInProgress(prev => prev ? {
          ...prev,
          currentPosition: {
            x: e.clientX - rect.left - canvasOffset.x,
            y: e.clientY - rect.top - canvasOffset.y
          }
        } : null);
      }
    }
  }, [isDraggingCanvas, dragStart, canvasOffset, draggedNode, connectionInProgress, nodes, onNodeUpdate]);

  const handleMouseUp = () => {
    setIsDraggingCanvas(false);
    setDraggedNode(null);
  };
  
  const handleStartConnection = (nodeId: string, condition: string) => {
    const startKey = `output-${nodeId}-${condition}`;
    const startPosition = terminalPositions.get(startKey);

    if (startPosition) {
      setConnectionInProgress({
        fromNodeId: nodeId,
        condition,
        startPosition: startPosition,
        currentPosition: startPosition
      });
    }
  };

  const handleEndConnection = (targetNodeId: string) => {
    if (connectionInProgress && connectionInProgress.fromNodeId !== targetNodeId) {
      const sourceNode = nodes.find(n => n.id === connectionInProgress.fromNodeId);
      const targetNode = nodes.find(n => n.id === targetNodeId);
      
      if (sourceNode && targetNode) {
        const updatedTransitions = {
          ...sourceNode.transitions,
          [connectionInProgress.condition]: targetNode.name
        };
        onNodeUpdate({
          ...sourceNode,
          transitions: updatedTransitions
        });
      }
    }
    setConnectionInProgress(null);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current && !isDraggingCanvas) {
      setConnectionInProgress(null);
      onNodeClick(''); // Deselect all nodes
    }
  };

  const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const node = nodes.find(n => n.id === nodeId);
    if (rect && node) {
      const offset = {
        x: e.clientX - rect.left - canvasOffset.x - node.position.x,
        y: e.clientY - rect.top - canvasOffset.y - node.position.y
      };
      setDraggedNode({ nodeId, offset });
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Generate connection line data from the measured positions
  const connections = nodes.flatMap(sourceNode =>
    Object.entries(sourceNode.transitions).map(([condition, targetName]) => {
      const targetNode = nodes.find(n => n.name === targetName);
      if (!targetNode) return null;

      const fromKey = `output-${sourceNode.id}-${condition}`;
      const toKey = `input-${targetNode.id}`;
      
      const fromPos = terminalPositions.get(fromKey);
      const toPos = terminalPositions.get(toKey);

      if (!fromPos || !toPos) return null;

      return {
        key: `${fromKey}-${toKey}`,
        from: fromPos,
        to: toPos,
        condition: condition
      };
    }).filter((c): c is NonNullable<typeof c> => c !== null));

  return (
    <div
      ref={canvasRef}
      className={`flex-1 relative bg-gray-50 overflow-hidden transition-colors select-none ${
        isDragOver ? 'bg-blue-50 border-2 border-dashed border-blue-300' : ''
      } ${isDraggingCanvas ? 'cursor-grabbing' : 'cursor-grab'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleCanvasClick}
    >
      {/* Grid background */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
          backgroundPosition: `${canvasOffset.x}px ${canvasOffset.y}px`
        }}
      />

      {/* Canvas content container */}
      <div 
        className="absolute inset-0"
        style={{
          transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)`
        }}
      >
        {/* Connection lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#8B5CF6"
              />
            </marker>
          </defs>
          
          {connections.map((connection) => (
            <ConnectionLine
              key={connection.key}
              from={connection.from}
              to={connection.to}
              condition={connection.condition}
            />
          ))}
          
          {/* Connection in progress */}
          {connectionInProgress && (
            <ConnectionLine
              from={connectionInProgress.startPosition}
              to={connectionInProgress.currentPosition}
              condition={connectionInProgress.condition}
              isTemporary
            />
          )}
        </svg>

        {/* Nodes */}
        {nodes.map(node => (
          <WorkflowNode
            key={node.id}
            node={node}
            isSelected={selectedNodeId === node.id}
            isStartNode={startNodeId === node.name}
            onClick={() => onNodeClick(node.id)}
            onDelete={() => onNodeDelete(node.id)}
            onSetAsStart={() => onSetStartNode(node.name)}
            onUpdate={onNodeUpdate}
            onStartConnection={handleStartConnection}
            onEndConnection={handleEndConnection}
            onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
            connectionInProgress={!!connectionInProgress}
            isDragging={!!draggedNode && draggedNode.nodeId === node.id}
            registerInputTerminal={(el) => registerTerminal(`input-${node.id}`, el as HTMLDivElement)}
            registerOutputTerminal={(condition, el) => registerTerminal(`output-${node.id}-${condition}`, el as HTMLDivElement)}
          />
        ))}
      </div>

      {/* Drop hint */}
      {isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="bg-white/90 backdrop-blur-sm p-6 rounded-lg border-2 border-dashed border-blue-400">
            <p className="text-blue-600 font-medium">Drop node here to add to workflow</p>
          </div>
        </div>
      )}

      {nodes.length === 0 && !isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-gray-500">
            <p className="text-lg font-medium mb-2">Start Building Your Workflow</p>
            <p>Drag nodes from the palette to begin</p>
            <p className="text-sm mt-2 opacity-75">Click and drag to pan the canvas</p>
          </div>
        </div>
      )}

      {/* Connection instructions */}
      {connectionInProgress && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-purple-100 text-purple-800 px-4 py-2 rounded-lg shadow-lg border border-purple-200 z-50">
          <p className="text-sm font-medium">Click on a target node to complete the connection</p>
          <p className="text-xs opacity-75">Condition: "{connectionInProgress.condition}"</p>
        </div>
      )}

      {/* Canvas controls hint */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md border border-gray-200 text-xs text-gray-600">
        <p>Click & drag canvas to pan • Click & drag nodes to move</p>
      </div>
    </div>
  );
};
