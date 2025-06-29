// src/components/JsonViewPanel.tsx
import React, { useState, useEffect } from 'react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism.css'; 
import { X, Copy, Check } from 'lucide-react'; // Import Copy and Check icons
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
  const [isCopied, setIsCopied] = useState(false); // State for copy feedback

  // Effect to update the editor when the workflow changes from the canvas
  useEffect(() => {
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
  }, 500);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    }).catch(err => {
      console.error('Failed to copy JSON: ', err);
    });
  };

  if (!isVisible) return null;

  return (
    <div className="w-1/3 max-w-2xl bg-white border-l border-gray-200 flex-shrink-0 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold text-gray-800">Live JSON View</h2>
            <button
              onClick={handleCopy}
              className={`flex items-center space-x-1.5 px-2 py-1 text-xs rounded-md font-semibold transition-colors ${
                isCopied
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Copied!' : 'Copy'}</span>
            </button>
        </div>
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