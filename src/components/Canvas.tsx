import React, { useRef, useState, useCallback, useLayoutEffect } from 'react';
import { WorkflowNode } from './WorkflowNode';
import { ConnectionLine } from './ConnectionLine';
import { AgentNode, ConnectionInProgress } from '../types/workflow';
import { ZoomIn, ZoomOut } from 'lucide-react';
type TerminalPositionMap = Map<string, { x: number; y: number }>;
interface DraggedNodeState {
  nodeId: string;
  initialNodePosition: { x: number;
y: number };
  initialMousePosition: { x: number; y: number };
  currentOffset: { x: number; y: number };
}

interface CanvasProps {
  nodes: AgentNode[];
  selectedNodeId: string | null;
  startNodeId: string;
  tools: string[];
  onNodeClick: (nodeId: string) => void;
onNodeDelete: (nodeId: string) => void;
  onNodeDrop: (position: { x: number; y: number }, nodeType: 'conversational' | 'tool_execution') => void;
onNodeUpdate: (updatedNode: AgentNode) => void;
  onSetStartNode: (nodeName: string) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  nodes,
  selectedNodeId,
  startNodeId,
  tools,
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
  const [draggedNode, setDraggedNode] = useState<DraggedNodeState | null>(null);
const [zoom, setZoom] = useState(1);
  const terminalPositions = useRef<Map<string, { x: number; y: number }>>(new Map());
const terminalElements = useRef<Map<string, HTMLElement | null>>(new Map());

  const registerTerminal = (key: string, el: HTMLElement | null) => {
    if (el) {
        terminalElements.current.set(key, el);
} else {
        terminalElements.current.delete(key);
    }
  };
useLayoutEffect(() => {
    const newPositions: Map<string, { x: number; y: number }> = new Map();
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    terminalElements.current.forEach((el, key) => {
      if (el) {
        const rect = el.getBoundingClientRect();
        const worldX = (rect.left - canvasRect.left - canvasOffset.x) / zoom + (rect.width / zoom / 2);
        const worldY = (rect.top - canvasRect.top - canvasOffset.y) / zoom + (rect.height / 
zoom / 2);
        newPositions.set(key, { x: worldX, y: worldY });
      }
    });
    
    terminalPositions.current = newPositions;
  }, [nodes, canvasOffset, selectedNodeId, draggedNode, zoom]);
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
      x: (e.clientX - rect.left - canvasOffset.x) / zoom - 128,
      y: (e.clientY - rect.top - canvasOffset.y) / zoom - 80
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
      return;
    }
    
    if (draggedNode) {
      const deltaX = e.clientX - draggedNode.initialMousePosition.x;
      const deltaY = e.clientY - draggedNode.initialMousePosition.y;
   
   
      setDraggedNode(prev => prev ? {
        ...prev,
        currentOffset: { x: deltaX, y: deltaY }
      } : null);
      return;
    }

    if (connectionInProgress) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        setConnectionInProgress(prev => prev ? {
          ...prev,
  
        currentPosition: {
            x: (e.clientX - rect.left - canvasOffset.x) / zoom,
            y: (e.clientY - rect.top - canvasOffset.y) / zoom
          }
        } : null);
      }
    }
  }, [isDraggingCanvas, dragStart, draggedNode, connectionInProgress, zoom]);
const handleMouseUp = () => {
    if (draggedNode) {
      const node = nodes.find(n => n.id === draggedNode.nodeId);
if (node) {
        const finalPosition = {
          x: draggedNode.initialNodePosition.x + draggedNode.currentOffset.x / zoom,
          y: draggedNode.initialNodePosition.y + draggedNode.currentOffset.y / zoom
        };
onNodeUpdate({ ...node, position: finalPosition });
      }
    }

    setIsDraggingCanvas(false);
    setDraggedNode(null);
  };
const handleStartConnection = (nodeId: string, condition: string) => {
    const startKey = `output-${nodeId}-${condition}`;
    const startPosition = terminalPositions.current.get(startKey);
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
    if (e.target === canvasRef.current) {
      setConnectionInProgress(null);
onNodeClick('');
    }
  };

  const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    const node = nodes.find(n => n.id === nodeId);
if (node && !connectionInProgress) {
      setDraggedNode({
        nodeId,
        initialNodePosition: node.position,
        initialMousePosition: { x: e.clientX, y: e.clientY },
        currentOffset: { x: 0, y: 0 }
      });
e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.1, 2));
const handleZoomOut = () => setZoom(z => Math.max(z - 0.1, 0.3));
const connections = nodes.flatMap(sourceNode =>
    Object.entries(sourceNode.transitions).map(([condition, targetName]) => {
      const targetNode = nodes.find(n => n.name === targetName);
      if (!targetNode) return null;

      const fromKey = `output-${sourceNode.id}-${condition}`;
      const toKey = `input-${targetNode.id}`;
      
      const fromPos = terminalPositions.current.get(fromKey);
      const toPos = terminalPositions.current.get(toKey);

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
     
 <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
          backgroundPosition: `${canvasOffset.x}px ${canvasOffset.y}px`,
   
       transform: `scale(${zoom})`,
          transformOrigin: 'top left',
        }}
      />

      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${zoom})`,
          transformOrigin: 'top left'
        }}
      >
  
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#8B5CF6"/>
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
     
     
          {connectionInProgress && (
            <ConnectionLine
              from={connectionInProgress.startPosition}
              to={connectionInProgress.currentPosition}
              condition={connectionInProgress.condition}
              isTemporary
            />
   
       )}
        </svg>

        {nodes.map(node => (
          <WorkflowNode
            key={node.id}
            node={node}
            nodes={nodes}
            tools={tools}
            isSelected={selectedNodeId === node.id}
            isStartNode={startNodeId === node.name}
 
           onClick={() => onNodeClick(node.id)}
            onDelete={() => onNodeDelete(node.id)}
            onSetAsStart={() => onSetStartNode(node.name)}
            onUpdate={onNodeUpdate}
            onStartConnection={handleStartConnection}
            onEndConnection={handleEndConnection}
            onMouseDown={(e: React.MouseEvent) => handleNodeMouseDown(node.id, e)}
       
     dragOffset={draggedNode?.nodeId === node.id ? draggedNode.currentOffset : null}
            connectionInProgress={!!connectionInProgress}
            isDragging={!!draggedNode && draggedNode.nodeId === node.id}
            zoom={zoom}
            registerInputTerminal={(el) => registerTerminal(`input-${node.id}`, el as HTMLDivElement)}
            registerOutputTerminal={(condition, el) => registerTerminal(`output-${node.id}-${condition}`, el as HTMLDivElement)}
          />
    
    ))}
      </div>

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

      {connectionInProgress && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-purple-100 text-purple-800 px-4 py-2 rounded-lg shadow-lg border border-purple-200 z-50">
          <p className="text-sm font-medium">Click on a target node to complete the connection</p>
          <p className="text-xs opacity-75">Condition: "{connectionInProgress.condition}"</p>
        </div>
      )}

      <div className="absolute bottom-4 right-4 
bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-md border border-gray-200 flex items-center divide-x divide-gray-200">
          <div className="pr-3 text-xs text-gray-600">
              <p>Click & drag canvas to pan • Click & drag nodes to move</p>
          </div>
          <div className="pl-3 flex items-center space-x-2 text-sm text-gray-700">
              <button onClick={handleZoomOut} className="p-1 hover:bg-gray-100 rounded-md disabled:text-gray-300" disabled={zoom <= 0.3} title="Zoom Out">
 
                 <ZoomOut className="w-5 h-5" />
              </button>
              <span className="font-semibold tabular-nums min-w-[40px] text-center" title="Zoom Level">{Math.round(zoom * 100)}%</span>
              <button onClick={handleZoomIn} className="p-1 hover:bg-gray-100 rounded-md disabled:text-gray-300" disabled={zoom >= 2} title="Zoom In">
                  <ZoomIn className="w-5 
h-5" />
              </button>
          </div>
      </div>
    </div>
  );
};