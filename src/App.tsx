import React, { useRef } from 'react';
import { NodePalette } from './components/NodePalette';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import { useWorkflow } from './hooks/useWorkflow';

function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    nodes,
    selectedNodeId,
    startNodeId,
    setSelectedNodeId,
    setStartNodeId,
    setDraggedNodeType,
    addNode,
    updateNode,
    deleteNode,
    clearAll,
    exportWorkflow,
    importWorkflow,
    validateWorkflow
  } = useWorkflow();

  const handleExport = () => {
    const workflow = exportWorkflow();
    const dataStr = JSON.stringify({ agent_graph: workflow }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'agent_workflow.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        importWorkflow(json);
      } catch (error) {
        alert('Failed to parse JSON file. Please check the file format.');
      }
    };
    reader.readAsText(file);
    
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleValidate = () => {
    const errors = validateWorkflow();
    if (errors.length === 0) {
      alert('Workflow validation passed! ✅');
    } else {
      alert('Validation errors:\n\n' + errors.join('\n'));
    }
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all nodes? This cannot be undone.')) {
      clearAll();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Toolbar
        onImport={handleImport}
        onExport={handleExport}
        onClear={handleClear}
        onValidate={handleValidate}
        hasNodes={nodes.length > 0}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <NodePalette onDragStart={setDraggedNodeType} />
        
        <Canvas
          nodes={nodes}
          selectedNodeId={selectedNodeId}
          startNodeId={startNodeId}
          onNodeClick={setSelectedNodeId}
          onNodeDelete={deleteNode}
          onNodeDrop={addNode}
          onSetStartNode={setStartNodeId}
          onNodeUpdate={updateNode}
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}

export default App;