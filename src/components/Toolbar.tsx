import React from 'react';
import { Download, Upload, Trash2, FileText, Code2 } from 'lucide-react';

interface ToolbarProps {
  onImport: () => void;
  onExport: () => void;
  onClear: () => void;
  onValidate: () => void;
  onToggleJsonPanel: () => void; // New prop
  isJsonPanelVisible: boolean; // New prop
  hasNodes: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onImport,
  onExport,
  onClear,
  onValidate,
  onToggleJsonPanel,
  isJsonPanelVisible,
  hasNodes
}) => {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Visual Agent Workflow Builder</h1>
        <p className="text-sm text-gray-600">Design and configure agent workflows with drag-and-drop</p>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={onToggleJsonPanel}
          disabled={!hasNodes}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            isJsonPanelVisible
              ? 'bg-indigo-200 text-indigo-800'
              : hasNodes
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>JSON</span>
        </button>
        <button
          onClick={onValidate}
          disabled={!hasNodes}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            hasNodes
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Validate</span>
        </button>

        <button
          onClick={onImport}
          className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
        >
          <Upload className="w-4 h-4" />
          <span>Import JSON</span>
        </button>

        <button
          onClick={onExport}
          disabled={!hasNodes}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            hasNodes
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Export JSON</span>
        </button>

        <button
          onClick={onClear}
          disabled={!hasNodes}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            hasNodes
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          <span>Clear All</span>
        </button>
      </div>
    </div>
  );
};