import { useState, useCallback } from 'react';
import { AgentNode } from '../types/workflow';

// Define the shape of the data in the exported/imported JSON file.
// Notice that the agent data itself does not contain the name.
type ExportedAgentData = Omit<AgentNode, 'id' | 'position' | 'name'>;
export interface ExportedWorkflow {
  start_node: string;
  agents: Record<string, ExportedAgentData>;
}

export const useWorkflow = () => {
  const [nodes, setNodes] = useState<AgentNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [startNodeId, setStartNodeId] = useState<string>('');

  const addNode = useCallback((position: { x: number; y: number }, type: 'conversational' | 'tool_execution') => {
    const nodeCount = nodes.filter(n => n.type === type).length + 1;
    let baseName = type === 'conversational' ? 'ConversationalAgent' : 'ToolExecutionAgent';
    let newName = `${baseName}${nodeCount}`;

    // Ensure new node name is unique
    while (nodes.some(n => n.name === newName)) {
        baseName += '+';
        newName = `${baseName}${nodeCount}`;
    }

    const newNode: AgentNode = {
      id: crypto.randomUUID(),
      name: newName,
      type,
      initial_prompt: 'A new agent ready for a prompt.',
      tools: [],
      force_tool_call: type === 'tool_execution',
      transitions: {},
      position
    };

    setNodes(prev => [...prev, newNode]);
    
    // Set as start node if it's the first node
    if (nodes.length === 0) {
      setStartNodeId(newName);
    }
  }, [nodes]);

  const updateNode = useCallback((updatedNode: AgentNode) => {
    const originalNode = nodes.find(n => n.id === updatedNode.id);

    setNodes(prev => {
        // First, update the node itself
        let newNodes = prev.map(node => node.id === updatedNode.id ? updatedNode : node);
        
        // If the name changed, update all transitions pointing to the old name
        if (originalNode && originalNode.name !== updatedNode.name) {
            newNodes = newNodes.map(node => {
                const newTransitions = { ...node.transitions };
                let changed = false;
                for (const key in newTransitions) {
                    if (newTransitions[key] === originalNode.name) {
                        newTransitions[key] = updatedNode.name;
                        changed = true;
                    }
                }
                return changed ? { ...node, transitions: newTransitions } : node;
            });
        }
        return newNodes;
    });

    // If the start node was the one that got renamed, update the startNodeId
    if (originalNode && originalNode.name === startNodeId) {
        setStartNodeId(updatedNode.name);
    }
  }, [nodes, startNodeId]);

  const deleteNode = useCallback((nodeId: string) => {
    const nodeToDelete = nodes.find(n => n.id === nodeId);
    if (!nodeToDelete) return;

    setNodes(prev => {
      // Filter out the deleted node
      const remainingNodes = prev.filter(node => node.id !== nodeId);
      
      // Remove any transitions that were pointing to the deleted node
      return remainingNodes.map(node => {
        const newTransitions = { ...node.transitions };
        let changed = false;
        Object.keys(newTransitions).forEach(key => {
            if(newTransitions[key] === nodeToDelete.name) {
                delete newTransitions[key];
                changed = true;
            }
        });
        return changed ? { ...node, transitions: newTransitions } : node;
      });
    });

    // If the deleted node was the start node, pick a new start node or clear it
    if (nodeToDelete.name === startNodeId) {
        const newStartNode = nodes.find(n => n.id !== nodeId);
        setStartNodeId(newStartNode ? newStartNode.name : '');
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

  const exportWorkflow = useCallback((): ExportedWorkflow => {
    const agents: Record<string, ExportedAgentData> = {};
    
    nodes.forEach(node => {
      // Destructure to remove properties that shouldn't be in the exported agent object
      const { id, position, name, ...agentData } = node;
      agents[name] = agentData;
    });

    return {
      start_node: startNodeId,
      agents
    };
  }, [nodes, startNodeId]);

  const importWorkflow = useCallback((workflow: { agent_graph: ExportedWorkflow }) => {
    const { agent_graph } = workflow;
    if (!agent_graph || !agent_graph.agents) {
        alert("Import failed: Invalid JSON structure.");
        return;
    }
    
    const nodeNames = Object.keys(agent_graph.agents);
    const existingNodesMap = new Map(nodes.map(node => [node.name, node]));
    const updatedNodes: AgentNode[] = [];
    const usedIds = new Set<string>();

    // Process nodes from the imported graph
    nodeNames.forEach((name, index) => {
      const agentData = agent_graph.agents[name];
      const existingNode = existingNodesMap.get(name);

      if (existingNode) {
        // Update existing node, preserving its ID and position
        const updatedNode: AgentNode = {
          ...existingNode,
          ...agentData,
          name: name, // Ensure name is correct
        };
        updatedNodes.push(updatedNode);
        usedIds.add(existingNode.id);
      } else {
        // It's a new node, create it with a new ID and calculated position
        const cols = Math.ceil(Math.sqrt(nodes.length || 1));
        const row = Math.floor(index / cols);
        const col = index % cols;

        const newNode: AgentNode = {
          id: crypto.randomUUID(),
          name: name,
          type: agentData.type,
          initial_prompt: agentData.initial_prompt,
          tools: agentData.tools,
          force_tool_call: agentData.force_tool_call,
          transitions: agentData.transitions,
          position: {
            x: 100 + col * 400,
            y: 100 + row * 350
          }
        };
        updatedNodes.push(newNode);
        usedIds.add(newNode.id);
      }
    });
    
    // The nodes are now the updated/new nodes. Any node from the old state that wasn't in the new
    // agent_graph is implicitly removed.
    setNodes(updatedNodes);
    setStartNodeId(agent_graph.start_node);
    setSelectedNodeId(null);
  }, []);

  const validateWorkflow = useCallback(() => {
    const errors: string[] = [];
    if (!startNodeId) errors.push("A start node must be designated.");
    
    const nodeNames = new Set<string>();
    nodes.forEach(node => {
      if (nodeNames.has(node.name)) errors.push(`Duplicate node name: "${node.name}".`);
      nodeNames.add(node.name);

      if (!node.initial_prompt.trim()) errors.push(`Node "${node.name}" is missing an initial prompt.`);

      Object.entries(node.transitions).forEach(([condition, targetName]) => {
        if (!targetName) errors.push(`Node "${node.name}" has an incomplete transition for condition "${condition}".`);
        else if (!nodes.some(n => n.name === targetName)) errors.push(`Node "${node.name}" has a transition to a non-existent node: "${targetName}".`);
      });
    });

    return errors;
  }, [nodes, startNodeId]);

  return {
    nodes,
    selectedNodeId,
    startNodeId,
    setSelectedNodeId,
    setStartNodeId,
    addNode,
    updateNode,
    deleteNode,
    clearAll,
    exportWorkflow,
    importWorkflow,
    validateWorkflow
  };
};