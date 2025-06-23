import React from 'react';
import { MessageCircle, Cog } from 'lucide-react';

interface NodePaletteProps {
  onDragStart: (nodeType: 'conversational' | 'tool_execution') => void;
}

export const NodePalette: React.FC<NodePaletteProps> = ({ onDragStart }) => {
  const handleDragStart = (e: React.DragEvent, nodeType: 'conversational' | 'tool_execution') => {
    e.dataTransfer.setData('application/json', JSON.stringify({ nodeType }));
    onDragStart(nodeType);
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4 flex-shrink-0">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Node Palette</h2>
      
      <div className="space-y-3">
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, 'conversational')}
          className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg cursor-move hover:bg-blue-100 hover:border-blue-300 transition-colors group"
        >
          <div className="flex items-center space-x-3">
            <MessageCircle className="w-6 h-6 text-blue-600 group-hover:text-blue-700" />
            <div>
              <h3 className="font-medium text-blue-800">Conversational Agent</h3>
              <p className="text-sm text-blue-600">Handles dialogue and routing</p>
            </div>
          </div>
        </div>

        <div
          draggable
          onDragStart={(e) => handleDragStart(e, 'tool_execution')}
          className="p-4 bg-teal-50 border-2 border-teal-200 rounded-lg cursor-move hover:bg-teal-100 hover:border-teal-300 transition-colors group"
        >
          <div className="flex items-center space-x-3">
            <Cog className="w-6 h-6 text-teal-600 group-hover:text-teal-700" />
            <div>
              <h3 className="font-medium text-teal-800">Tool Execution Agent</h3>
              <p className="text-sm text-teal-600">Executes specific functions</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          Drag nodes onto the canvas to build your workflow. Each node name must be unique.
        </p>
      </div>
    </div>
  );
};