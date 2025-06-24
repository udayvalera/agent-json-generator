import React, { useState } from 'react';
import { MessageCircle, Cog, Play, Trash2, Plus, ChevronsDown, ChevronsUp, Move} from 'lucide-react';
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
  dragOffset?: { x: number; y: number } | null;
  connectionInProgress: boolean;
  isDragging: boolean;
  zoom: number;
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
  dragOffset,
  onMouseDown,
  connectionInProgress,
  isDragging,
  zoom,
  registerInputTerminal,
  registerOutputTerminal,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(node.name);
  const [nameError, setNameError] = useState('');
  const [editingTransition, setEditingTransition] = useState<{ oldCondition: string; newCondition: string } | null>(null);
  const isConversational = node.type === 'conversational';
  const transitionEntries = Object.entries(node.transitions);
  const nodeColors = {
    conversational: {
      bg: 'bg-blue-50',
      border: 'border-blue-400',
      shadow: 'shadow-blue-500/20',
      text: 'text-blue-800',
      icon: 'text-blue-600',
    },
    tool_execution: {
      bg: 'bg-purple-50',
      border: 'border-purple-400',
      shadow: 'shadow-purple-500/20',
      text: 'text-purple-800',
      icon: 'text-purple-600',
    }
  };
  const colors = isConversational ? nodeColors.conversational : nodeColors.tool_execution;

  const validateAndSaveName = () => {
    if (!tempName.trim()) {
      setNameError('Name cannot be empty.');
      return;
    }
    if (nodes.some(n => n.id !== node.id && n.name === tempName)) {
      setNameError('Name must be unique.');
      return;
    }
    onUpdate({ ...node, name: tempName });
    setNameError('');
    setEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      validateAndSaveName();
    } else if (e.key === 'Escape') {
      setTempName(node.name);
      setNameError('');
      setEditingName(false);
    }
  };

  const addTransition = () => {
    const newCondition = 'new_condition';
    let i = 1;
    while (`${newCondition}_${i}` in node.transitions) {
      i++;
    }
    onUpdate({ ...node, transitions: { ...node.transitions, [`${newCondition}_${i}`]: '' } });
  };

  const updateTransitionCondition = (oldCondition: string, newCondition: string) => {
    if (oldCondition === newCondition || !newCondition.trim()) return;
    const newTransitions = { ...node.transitions };
    const target = newTransitions[oldCondition];
    delete newTransitions[oldCondition];
    newTransitions[newCondition.trim()] = target;
    onUpdate({ ...node, transitions: newTransitions });
  };

  const removeTransition = (condition: string) => {
    const { [condition]: _, ...rest } = node.transitions;
    onUpdate({ ...node, transitions: rest });
  };
  
  const toggleTool = (tool: string) => {
    const newTools = node.tools.includes(tool)
      ? node.tools.filter(t => t !== tool)
      : [...node.tools, tool];
    onUpdate({ ...node, tools: newTools });
  };

  const style: React.CSSProperties = {
    top: `${node.position.y}px`,
    left: `${node.position.x}px`,
    pointerEvents: 'auto',
    transform: (isDragging && dragOffset)
      ? `translate(${dragOffset.x / zoom}px, ${dragOffset.y / zoom}px)`
      : 'none',
    transition: isDragging ? 'none' : 'transform 0.1s ease-out',
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

  return (
    <div
      className={`absolute bg-white rounded-xl transition-all duration-150 flex flex-col ${isDragging ? `shadow-2xl scale-105 z-50 ${colors.shadow}` : `shadow-lg ${colors.shadow}`} ${isSelected ? `border-2 ${colors.border}` : 'border border-gray-200'} w-80`}
      style={style}
      onClick={handleNodeClick}
    >
      {isStartNode && <div className="absolute -top-3 -left-3 bg-green-500 text-white rounded-full p-1.5 z-20 shadow-md border-2 border-white"><Play className="w-4 h-4" /></div>}
      <div ref={registerInputTerminal} className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 z-0">{connectionInProgress && <div className="w-full h-full bg-purple-200 rounded-full border-2 border-white shadow-lg animate-pulse ring-2 ring-purple-400"></div>}</div>
      
      <div 
        className={`p-3 rounded-t-xl flex items-center justify-between space-x-3 ${colors.bg} cursor-grab active:cursor-grabbing`}
        onMouseDown={onMouseDown}
      >
        <div className="flex-1 flex items-center space-x-3 min-w-0">
            <Move className="w-4 h-4 text-gray-400 pointer-events-none" />
            <div className="flex items-center space-x-2 min-w-0">
               {isConversational ? <MessageCircle className={`w-5 h-5 ${colors.icon}`} /> : <Cog className={`w-5 h-5 ${colors.icon}`} />}
                {editingName ? (
                    <div className="flex flex-col w-full" onMouseDown={e => e.stopPropagation()}>
                        <input type="text" value={tempName} onChange={e => setTempName(e.target.value)} onKeyDown={handleNameKeyDown} onBlur={validateAndSaveName} autoFocus onClick={e => e.stopPropagation()} className={`w-full px-2 py-1 text-md font-semibold rounded-md border ${nameError ? 'border-red-400' : 'border-blue-300'} focus:ring-2 focus:ring-blue-300 focus:outline-none`} />
                        {nameError && <p className="text-xs text-red-600 mt-1">{nameError}</p>}
                    </div>
                ) : (
                    <h3 onClick={e => { e.stopPropagation(); setEditingName(true); }} onMouseDown={e => e.stopPropagation()} className={`font-semibold text-md ${colors.text} cursor-pointer hover:bg-white/60 px-2 py-1 rounded-md truncate`}>{node.name}</h3>
                )}
            </div>
        </div>
        <div className="flex items-center space-x-1">
          <button onClick={e => { e.stopPropagation(); onDelete(); }} onMouseDown={e => e.stopPropagation()} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-md" title="Delete node"><Trash2 className="w-4 h-4" /></button>
          {!isStartNode && <button onClick={e => { e.stopPropagation(); onSetAsStart(); }} onMouseDown={e => e.stopPropagation()} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-100 rounded-md" title="Set as start node"><Play className="w-4 h-4" /></button>}
        </div>
      </div>
      
      <div className={`p-4 space-y-4 transition-all duration-300 ${isExpanded ? 'max-h-none' : 'max-h-0 overflow-hidden'}`}>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Initial Prompt</label>
          <textarea value={node.initial_prompt} onChange={e => onUpdate({ ...node, initial_prompt: e.target.value })} onClick={e => e.stopPropagation()} rows={3} className="w-full text-sm p-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-purple-300 focus:outline-none" placeholder="Enter agent's starting instructions..." />
        </div>
        {node.type === 'tool_execution' && (
             <div>
                 <label className="block text-xs font-medium text-gray-500 mb-2">Tools</label>
                <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_TOOLS.map(tool => (
                        <label key={tool} className="flex items-center space-x-2 p-1.5 hover:bg-gray-100 rounded-md cursor-pointer">
                           <input type="checkbox" checked={node.tools.includes(tool)} onChange={() => toggleTool(tool)} onClick={e => e.stopPropagation()} className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                            <span className="text-sm text-gray-700">{tool.replace('_tool', '')}</span>
                        </label>
                     ))}
                </div>
                <label className="flex items-center space-x-2 p-1.5 hover:bg-gray-100 rounded-md cursor-pointer mt-2">
                    <input type="checkbox" checked={node.force_tool_call} onChange={e => onUpdate({ ...node, force_tool_call: e.target.checked })} onClick={e => e.stopPropagation()} className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                    <span className="text-sm font-medium text-gray-700">Force Tool Call</span>
                </label>
             </div>
        )}
      </div>

      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-medium text-gray-500">Transitions</label>
            <button onClick={e => { e.stopPropagation(); addTransition(); }} className="flex items-center space-x-1.5 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 font-semibold"><Plus className="w-3 h-3" /><span>Add</span></button>
        </div>
        <div className="space-y-2">
            {transitionEntries.length > 0 ? transitionEntries.map(([condition, targetName]) => {
                const isEditing = editingTransition?.oldCondition === condition;
                return (
                  <div key={condition} className="relative flex items-center justify-between bg-gray-100 p-2 rounded-lg group">
                      <input 
                        type="text" 
                        value={isEditing ? editingTransition.newCondition : condition} 
                        onFocus={() => setEditingTransition({ oldCondition: condition, newCondition: condition })}
                        onChange={e => {
                          e.stopPropagation();
                          setEditingTransition(prev => prev ? { ...prev, newCondition: e.target.value } : null);
                        }}
                        onBlur={() => {
                          if (editingTransition) {
                            updateTransitionCondition(editingTransition.oldCondition, editingTransition.newCondition);
                            setEditingTransition(null);
                          }
                        }}
                        onKeyDown={e => { 
                          e.stopPropagation();
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                          if (e.key === 'Escape') setEditingTransition(null);
                        }} 
                        onClick={e => e.stopPropagation()} 
                        className="flex-1 text-sm bg-transparent outline-none focus:bg-white px-1 py-0.5 rounded-md"/>
                      <button onClick={() => removeTransition(condition)} className="p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
                      <div ref={el => registerOutputTerminal(condition, el)} className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-6 h-6 z-10" onMouseDown={e => handleTerminalMouseDown(condition, e)}>
                          <div className={`w-full h-full rounded-full border-2 border-white shadow-md flex items-center justify-center transition-all cursor-pointer group-hover:scale-125 ${targetName ? 'bg-green-500 group-hover:bg-green-600' : 'bg-purple-500 group-hover:bg-purple-600'}`} />
                      </div>
                  </div>
                )
            }) : <div className="text-center py-2"><p className="text-sm text-gray-400 italic">No transitions.</p></div>}
        </div>
      </div>
      
      <div className="border-t border-gray-200 flex justify-center mt-auto">
        <button onClick={e => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="py-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 w-full" title={isExpanded ? 'Collapse' : 'Expand'}>
            {isExpanded ? <ChevronsUp className="w-5 h-5 mx-auto" /> : <ChevronsDown className="w-5 h-5 mx-auto" />}
        </button>
      </div>
    </div>
  );
};