import { useState, useCallback } from 'react';
import { AgentNode, WorkflowState } from '../types/workflow';

export const useWorkflow = () => {
  const [nodes, setNodes] = useState<AgentNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [startNodeId, setStartNodeId] = useState<string>('');
  const [draggedNodeType, setDraggedNodeType] = useState<'conversational' | 'tool_execution' | null>(null);

  const generateId = () => Math.random().toString(36).substring(2, 15);

  const addNode = useCallback((position: { x: number; y: number }, type: 'conversational' | 'tool_execution') => {
    const nodeCount = nodes.filter(n => n.type === type).length + 1;
    const baseName = type === 'conversational' ? 'ConversationalAgent' : 'ToolExecutionAgent';
    const name = `${baseName}${nodeCount}`;

    const newNode: AgentNode = {
      id: generateId(),
      name,
      type,
      initial_prompt: '',
      tools: [],
      force_tool_call: type === 'tool_execution',
      transitions: {},
      position
    };

    setNodes(prev => [...prev, newNode]);
    
    // Set as start node if it's the first node
    if (nodes.length === 0) {
      setStartNodeId(name);
    }
  }, [nodes]);

  const updateNode = useCallback((updatedNode: AgentNode) => {
    setNodes(prev => prev.map(node => 
      node.id === updatedNode.id ? updatedNode : node
    ));

    // Update start node if name changed
    const originalNode = nodes.find(n => n.id === updatedNode.id);
    if (originalNode && originalNode.name === startNodeId && originalNode.name !== updatedNode.name) {
      setStartNodeId(updatedNode.name);
    }

    // Update transitions that reference the old name
    if (originalNode && originalNode.name !== updatedNode.name) {
      setNodes(prev => prev.map(node => ({
        ...node,
        transitions: Object.fromEntries(
          Object.entries(node.transitions).map(([condition, target]) => [
            condition,
            target === originalNode.name ? updatedNode.name : target
          ])
        )
      })));
    }
  }, [nodes, startNodeId]);

  const deleteNode = useCallback((nodeId: string) => {
    const nodeToDelete = nodes.find(n => n.id === nodeId);
    if (!nodeToDelete) return;

    // Remove transitions pointing to this node
    setNodes(prev => prev
      .filter(node => node.id !== nodeId)
      .map(node => ({
        ...node,
        transitions: Object.fromEntries(
          Object.entries(node.transitions).filter(([, target]) => target !== nodeToDelete.name)
        )
      }))
    );

    // Update start node if needed
    if (nodeToDelete.name === startNodeId) {
      const remainingNodes = nodes.filter(n => n.id !== nodeId);
      setStartNodeId(remainingNodes.length > 0 ? remainingNodes[0].name : '');
    }

    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  }, [nodes, startNodeId, selectedNodeId]);

  const clearAll = useCallback(() => {
    setNodes([]);
    setSelectedNodeId(null);
    setStartNodeId('');
  }, []);

  const exportWorkflow = useCallback((): WorkflowState => {
    const agents: Record<string, Omit<AgentNode, 'id' | 'position'>> = {};
    
    nodes.forEach(node => {
      agents[node.name] = {
        name: node.name,
        type: node.type,
        initial_prompt: node.initial_prompt,
        tools: node.tools,
        force_tool_call: node.force_tool_call,
        transitions: node.transitions
      };
    });

    return {
      start_node: startNodeId,
      agents
    };
  }, [nodes, startNodeId]);

  const importWorkflow = useCallback((workflow: { agent_graph: WorkflowState }) => {
    const { agent_graph } = workflow;
    const importedNodes: AgentNode[] = [];
    
    // Calculate positions in a grid layout
    const nodeNames = Object.keys(agent_graph.agents);
    const cols = Math.ceil(Math.sqrt(nodeNames.length));
    
    nodeNames.forEach((name, index) => {
      const agent = agent_graph.agents[name];
      const row = Math.floor(index / cols);
      const col = index % cols;
      
      importedNodes.push({
        id: generateId(),
        ...agent,
        position: {
          x: 100 + col * 350,
          y: 100 + row * 250
        }
      });
    });

    setNodes(importedNodes);
    setStartNodeId(agent_graph.start_node);
    setSelectedNodeId(null);
  }, []);

  const validateWorkflow = useCallback(() => {
    const errors: string[] = [];
    
    if (nodes.length === 0) {
      errors.push('Workflow must have at least one node');
    }

    if (!startNodeId) {
      errors.push('A start node must be designated');
    }

    const nodeNames = new Set();
    nodes.forEach(node => {
      if (nodeNames.has(node.name)) {
        errors.push(`Duplicate node name: ${node.name}`);
      }
      nodeNames.add(node.name);

      if (!node.initial_prompt.trim()) {
        errors.push(`Node "${node.name}" is missing an initial prompt`);
      }

      // Check if transitions point to valid nodes
      Object.values(node.transitions).forEach(targetName => {
        if (targetName && !nodes.some(n => n.name === targetName)) {
          errors.push(`Node "${node.name}" has transition to non-existent node: ${targetName}`);
        }
      });
    });

    return errors;
  }, [nodes, startNodeId]);

  return {
    nodes,
    selectedNodeId,
    startNodeId,
    draggedNodeType,
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
  };
};