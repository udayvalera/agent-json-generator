import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { AgentNode, AVAILABLE_TOOLS } from '../types/workflow';

interface ConfigurationPanelProps {
  node: AgentNode | null;
  nodes: AgentNode[];
  onClose: () => void;
  onSave: (updatedNode: AgentNode) => void;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  node,
  nodes,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<AgentNode | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (node) {
      setFormData({ ...node });
      setErrors({});
    }
  }, [node]);

  if (!node || !formData) return null;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name !== node.name && nodes.some(n => n.name === formData.name)) {
      newErrors.name = 'Name must be unique';
    }

    if (!formData.initial_prompt.trim()) {
      newErrors.initial_prompt = 'Initial prompt is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
    }
  };

  const addTransition = () => {
    setFormData({
      ...formData,
      transitions: {
        ...formData.transitions,
        '': ''
      }
    });
  };

  const updateTransition = (oldCondition: string, newCondition: string, targetName: string) => {
    const newTransitions = { ...formData.transitions };
    delete newTransitions[oldCondition];
    if (newCondition && targetName) {
      newTransitions[newCondition] = targetName;
    }
    setFormData({
      ...formData,
      transitions: newTransitions
    });
  };

  const removeTransition = (condition: string) => {
    const newTransitions = { ...formData.transitions };
    delete newTransitions[condition];
    setFormData({
      ...formData,
      transitions: newTransitions
    });
  };

  const toggleTool = (tool: string) => {
    const newTools = formData.tools.includes(tool)
      ? formData.tools.filter(t => t !== tool)
      : [...formData.tools, tool];
    
    setFormData({
      ...formData,
      tools: newTools
    });
  };

  const otherNodes = nodes.filter(n => n.id !== node.id);

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex-shrink-0 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Configure Node</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded text-gray-500"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Node Type Badge */}
        <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
          formData.type === 'conversational' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-teal-100 text-teal-800'
        }`}>
          {formData.type === 'conversational' ? 'Conversational Agent' : 'Tool Execution Agent'}
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Node Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
              errors.name ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter unique node name"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>

        {/* Initial Prompt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Initial Prompt *
          </label>
          <textarea
            value={formData.initial_prompt}
            onChange={(e) => setFormData({ ...formData, initial_prompt: e.target.value })}
            rows={4}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
              errors.initial_prompt ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter the initial prompt for this agent"
          />
          {errors.initial_prompt && <p className="mt-1 text-sm text-red-600">{errors.initial_prompt}</p>}
        </div>

        {/* Tools (Tool Execution only) */}
        {formData.type === 'tool_execution' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available Tools
              </label>
              <div className="grid grid-cols-1 gap-2">
                {AVAILABLE_TOOLS.map(tool => (
                  <label key={tool} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.tools.includes(tool)}
                      onChange={() => toggleTool(tool)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">{tool}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.force_tool_call}
                  onChange={(e) => setFormData({ ...formData, force_tool_call: e.target.checked })}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700">Force Tool Call</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                When enabled, the agent must use one of the selected tools
              </p>
            </div>
          </>
        )}

        {/* Transitions */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Transitions
            </label>
            <button
              onClick={addTransition}
              className="flex items-center space-x-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
            >
              <Plus className="w-3 h-3" />
              <span>Add</span>
            </button>
          </div>

          <div className="space-y-3">
            {Object.entries(formData.transitions).map(([condition, targetName]) => (
              <div key={condition} className="grid grid-cols-5 gap-2 items-start">
                <div className="col-span-2">
                  <input
                    type="text"
                    value={condition}
                    onChange={(e) => updateTransition(condition, e.target.value, targetName)}
                    placeholder="Condition"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div className="col-span-2">
                  <select
                    value={targetName}
                    onChange={(e) => updateTransition(condition, condition, e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">Select target</option>
                    {otherNodes.map(n => (
                      <option key={n.id} value={n.name}>{n.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => removeTransition(condition)}
                  className="p-1 text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {Object.keys(formData.transitions).length === 0 && (
            <p className="text-sm text-gray-500 italic">No transitions defined</p>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleSave}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </button>
      </div>
    </div>
  );
};