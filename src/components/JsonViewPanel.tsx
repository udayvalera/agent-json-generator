// src/components/JsonViewPanel.tsx
import React, { useState, useEffect } from 'react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism.css';
// You can choose a different theme
import { X } from 'lucide-react';
import { ExportedWorkflow } from '../hooks/useWorkflow';

interface JsonViewPanelProps {
  workflowJson: ExportedWorkflow;
  onJsonChange: (workflow: { agent_graph: ExportedWorkflow }) => void;
  onClose: () => void;
  isVisible: boolean;
}

// A simple debounce function
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>): void => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
}

export const JsonViewPanel: React.FC<JsonViewPanelProps> = ({ workflowJson, onJsonChange, onClose, isVisible }) => {
  const [jsonString, setJsonString] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Effect to update the editor when the workflow changes from the canvas
  useEffect(() => {
    // Only update if the panel is visible to avoid overwriting user edits
    if (isVisible) {
      setJsonString(JSON.stringify(workflowJson, null, 2));
    }
  }, [workflowJson, isVisible]);
  const handleJsonChange = (newJson: string) => {
    setJsonString(newJson);
    validateAndSync(newJson);
  };
  const validateAndSync = debounce((newJson: string) => {
    try {
      const parsedJson = JSON.parse(newJson);
      onJsonChange({ agent_graph: parsedJson });
      setError(null);
    } catch (e) {
      setError('Invalid JSON format.');
      console.error('JSON parsing error:', e);
    }
  }, 500); // 500ms debounce

  if (!isVisible) return null;

  return (
    <div className="w-1/3 max-w-2xl bg-white border-l border-gray-200 flex-shrink-0 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Live JSON View</h2>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-500">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto font-mono text-sm relative">
  
       <Editor
          value={jsonString}
          onValueChange={handleJsonChange}
          highlight={code => highlight(code, languages.json, 'json')}
          padding={16}
          className="bg-gray-50"
          style={{
            fontFamily: '"Fira Code", "Fira Mono", monospace',
            fontSize: 14,
            minHeight: '100%',
          }}
        />
      </div>

      <div className="p-2 border-t border-gray-200 bg-white">
        {error ? (
          <p className="text-sm text-red-600 px-2">{error}</p>
        ) : (
          <p className="text-sm text-green-600 px-2">JSON is valid.</p>
        )}
      </div>
   
    </div>
  );
};