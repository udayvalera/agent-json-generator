import React, { useState } from 'react';
import { Plus, Tag } from 'lucide-react';

interface ToolPaletteProps {
  tools: string[];
  onAddTool: (toolName: string) => void;
}

export const ToolPalette: React.FC<ToolPaletteProps> = ({ tools, onAddTool }) => {
  const [newToolName, setNewToolName] = useState('');
  const [error, setError] = useState('');

  const handleAddTool = () => {
    if (!newToolName.trim()) {
      setError('Tool name cannot be empty.');
      return;
    }
    if (tools.includes(newToolName.trim())) {
      setError('Tool name must be unique.');
      return;
    }
    onAddTool(newToolName.trim());
    setNewToolName('');
    setError('');
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4 flex-shrink-0">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Tools</h2>
      <div className="space-y-2 mb-4">
        {tools.map(tool => (
          <div key={tool} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md">
            <Tag className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-700">{tool}</span>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <input
          type="text"
          value={newToolName}
          onChange={(e) => setNewToolName(e.target.value)}
          placeholder="Enter new tool name"
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-300 focus:outline-none"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          onClick={handleAddTool}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          <span>Add Tool</span>
        </button>
      </div>
    </div>
  );
};