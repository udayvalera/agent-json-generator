import React, { useState } from 'react';
import { MessageCircle, Cog, Play, Trash2, Plus, X, Move } from 'lucide-react';
import { AgentNode, AVAILABLE_TOOLS } from '../types/workflow';

interface WorkflowNodeProps {
  node: AgentNode;
  nodes: AgentNode[];
  isSelected: boolean;
  isStartNode: boolean;
  onClick: () => void;
  onDelete: () => void;
  onSetAsStart: () => void;
  onUpdate: (updatedNode: AgentNode) => void;
  onStartConnection: (nodeId: string, condition: string) => void;
  onEndConnection: (nodeId: string) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  connectionInProgress: boolean;
  isDragging: boolean;
  registerInputTerminal: (el: HTMLDivElement | null) => void;
  registerOutputTerminal: (condition: string, el: HTMLDivElement | null) => void;
}

export const WorkflowNode: React.FC<WorkflowNodeProps> = ({
  node,
  nodes,
  isSelected,
  isStartNode,
  onClick,
  onDelete,
  onSetAsStart,
  onUpdate,
  onStartConnection,
  onEndConnection,
  onMouseDown,
  connectionInProgress,
  isDragging,
  registerInputTerminal,
  registerOutputTerminal,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(node.name);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isConversational = node.type === 'conversational';

  const validateName = (name: string): boolean => {
    if (!name.trim()) {
      setErrors(prev => ({ ...prev, name: 'Name is required' }));
      return false;
    }
    if (name !== node.name && nodes.some(n => n.name === name)) {
      setErrors(prev => ({ ...prev, name: 'Name must be unique' }));
      return false;
    }
    setErrors(prev => ({ ...prev, name: '' }));
    return true;
  };

  const handleNameSave = () => {
    if (validateName(tempName)) {
      onUpdate({ ...node, name: tempName });
      setEditingName(false);
    }
  };

  const handleNameCancel = () => {
    setTempName(node.name);
    setEditingName(false);
    setErrors(prev => ({ ...prev, name: '' }));
  };

  const updatePrompt = (prompt: string) => {
    onUpdate({ ...node, initial_prompt: prompt });
  };

  const addTransition = () => {
    const newTransitions = { ...node.transitions, '': '' };
    onUpdate({ ...node, transitions: newTransitions });
  };

  const updateTransitionCondition = (oldCondition: string, newCondition: string) => {
    const newTransitions = { ...node.transitions };
    const targetName = newTransitions[oldCondition];
    delete newTransitions[oldCondition];
    if (newCondition.trim()) {
      newTransitions[newCondition] = targetName;
    }
    onUpdate({ ...node, transitions: newTransitions });
  };

  const removeTransition = (condition: string) => {
    const newTransitions = { ...node.transitions };
    delete newTransitions[condition];
    onUpdate({ ...node, transitions: newTransitions });
  };

  const toggleTool = (tool: string) => {
    const newTools = node.tools.includes(tool)
      ? node.tools.filter(t => t !== tool)
      : [...node.tools, tool];
    onUpdate({ ...node, tools: newTools });
  };

  const handleTerminalMouseDown = (condition: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onStartConnection(node.id, condition);
  };

  const handleNodeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (connectionInProgress) {
      onEndConnection(node.id);
    } else {
      onClick();
    }
  };

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (
      e.target instanceof HTMLElement && 
      !e.target.closest('button') && 
      !e.target.closest('input') &&
      !e.target.closest('textarea') &&
      !editingName
    ) {
      onMouseDown(e);
    }
  };

  const transitionEntries = Object.entries(node.transitions);

  return (
    <div
      className={`absolute bg-white rounded-lg shadow-md border-2 transition-all hover:shadow-lg ${
        isDragging ? 'shadow-2xl scale-105 z-50' : ''
      } ${
        isSelected 
          ? 'border-purple-400 shadow-purple-100' 
          : isConversational 
            ? 'border-blue-200 hover:border-blue-300' 
            : 'border-teal-200 hover:border-teal-300'
      } ${isExpanded ? 'w-80' : 'w-64'}`}
      style={{ left: node.position.x, top: node.position.y }}
      onClick={handleNodeClick}
    >
      {isStartNode && (
        <div className="absolute -top-2 -left-2 bg-green-500 text-white rounded-full p-1 z-20">
          <Play className="w-3 h-3" />
        </div>
      )}

      {/* Input connection point */}
       <div
        ref={registerInputTerminal}
        className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 z-0"
      >
        {connectionInProgress && (
            <div className="w-full h-full bg-purple-200 rounded-full border-2 border-white shadow-lg animate-pulse ring-2 ring-purple-400"></div>
        )}
      </div>
      
      {/* Header with drag handle */}
      <div 
        className={`p-3 rounded-t-lg flex items-center justify-between ${isConversational ? 'bg-blue-50' : 'bg-teal-50'} ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onMouseDown={handleHeaderMouseDown}
      >
        <div className="flex items-center space-x-2 cursor-grab" onMouseDown={handleHeaderMouseDown}>
          <Move className="w-3 h-3 text-gray-400" />
          {isConversational ? (
            <MessageCircle className="w-4 h-4 text-blue-600" />
          ) : (
            <Cog className="w-4 h-4 text-teal-600" />
          )}
          <span className={`text-xs font-medium ${isConversational ? 'text-blue-800' : 'text-teal-800'}`}>
            {isConversational ? 'Conversational' : 'Tool Execution'}
          </span>
        </div>
        
        <div className="flex space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-1 hover:bg-white rounded text-gray-500"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          </button>
          {!isStartNode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSetAsStart();
              }}
              className="p-1 hover:bg-white rounded text-gray-500 hover:text-green-600"
              title="Set as start node"
            >
              <Play className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 hover:bg-white rounded text-gray-500 hover:text-red-600"
            title="Delete node"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Name */}
        <div>
          {editingName ? (
            <div className="space-y-1">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameSave();
                  if (e.key === 'Escape') handleNameCancel();
                }}
                className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-purple-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
            </div>
          ) : (
            <h3 
              className="font-semibold text-gray-800 cursor-text hover:bg-gray-50 px-1 py-0.5 rounded"
              onClick={(e) => {
                e.stopPropagation();
                setEditingName(true);
              }}
            >
              {node.name}
            </h3>
          )}
        </div>

        {/* Initial Prompt */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Initial Prompt</label>
          <textarea
            value={node.initial_prompt}
            onChange={(e) => updatePrompt(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            rows={isExpanded ? 4 : 2}
            className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-purple-500 resize-none bg-gray-50 hover:bg-white"
            placeholder="Enter the initial prompt for this agent"
          />
        </div>

        {/* Tools (Tool Execution only) - EXPANDED */}
        {node.type === 'tool_execution' && isExpanded && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Tools</label>
            <div className="grid grid-cols-2 gap-1 mb-2">
              {AVAILABLE_TOOLS.map(tool => (
                <label key={tool} className="flex items-center space-x-1 p-1 hover:bg-gray-100 rounded">
                  <input
                    type="checkbox"
                    checked={node.tools.includes(tool)}
                    onChange={() => toggleTool(tool)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-3 h-3 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-xs text-gray-700">{tool.replace('_tool', '')}</span>
                </label>
              ))}
            </div>
            <label className="flex items-center space-x-2 p-1 hover:bg-gray-100 rounded">
              <input
                type="checkbox"
                checked={node.force_tool_call}
                onChange={(e) => onUpdate({ ...node, force_tool_call: e.target.checked })}
                onClick={(e) => e.stopPropagation()}
                className="w-3 h-3 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-xs font-medium text-gray-700">Force Tool Call</span>
            </label>
          </div>
        )}

        {/* Transitions - EXPANDED */}
        {isExpanded && (
            <div>
            <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-gray-600">Transitions</label>
                <button
                onClick={(e) => {
                    e.stopPropagation();
                    addTransition();
                }}
                className="flex items-center space-x-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                >
                <Plus className="w-3 h-3" />
                <span>Add</span>
                </button>
            </div>

            <div className="space-y-2 max-h-32 overflow-y-auto">
                {transitionEntries.map(([condition, targetName]) => (
                <div key={condition} className="relative group">
                    <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded pr-8">
                    <input
                        type="text"
                        value={condition}
                        onChange={(e) => updateTransitionCondition(condition, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Condition"
                        className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500"
                    />
                    <button
                        onClick={(e) => {
                        e.stopPropagation();
                        removeTransition(condition);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Remove transition"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                    </div>
                    
                    <div 
                        ref={(el) => registerOutputTerminal(condition, el)}
                        className="absolute right-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 z-10"
                        onMouseDown={(e) => handleTerminalMouseDown(condition, e)}
                    >
                        <div className={`w-full h-full rounded-full border-2 border-white shadow-lg flex items-center justify-center transition-all cursor-pointer hover:scale-110 ${
                            targetName 
                            ? 'bg-green-500 hover:bg-green-600' 
                            : 'bg-purple-500 hover:bg-purple-600'
                        }`}>
                        </div>
                    </div>
                </div>
                ))}
            </div>

            {transitionEntries.length === 0 && (
                <p className="text-xs text-gray-500 italic py-2">No transitions defined.</p>
            )}
            </div>
        )}

        {/* Summary when collapsed */}
        {!isExpanded && (
          <div className="text-xs text-gray-500 space-y-1 pt-2 border-t border-gray-100">
            {node.type === 'tool_execution' && node.tools.length > 0 && (
              <p>Tools: <span className='font-medium text-gray-600'>{node.tools.length}</span></p>
            )}
            {transitionEntries.length > 0 && (
              <p>Transitions: <span className='font-medium text-gray-600'>{transitionEntries.length}</span></p>
            )}
          </div>
        )}
      </div>

      {/* Output connection terminals for collapsed view */}
      {!isExpanded && transitionEntries.length > 0 && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 flex flex-col space-y-2 z-10">
          {transitionEntries.map(([condition, targetName]) => (
            <div 
              key={condition}
              ref={(el) => registerOutputTerminal(condition, el)}
              className="group w-6 h-6 flex items-center justify-center"
              onMouseDown={(e) => handleTerminalMouseDown(condition, e)}
            >
              <div className={`w-4 h-4 rounded-full border-2 border-white shadow-md flex items-center justify-center transition-all cursor-pointer group-hover:scale-125 ${
                targetName 
                  ? 'bg-green-500 group-hover:bg-green-600' 
                  : 'bg-purple-500 group-hover:bg-purple-600'
              }`}>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};