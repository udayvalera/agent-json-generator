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

    // Build adjacency list for the graph
    const adjacencyList = new Map<string, string[]>();
    nodeNames.forEach(name => {
      adjacencyList.set(name, []);
    });
    
    // Populate adjacency list based on transitions
    nodeNames.forEach(name => {
      const agentData = agent_graph.agents[name];
      const transitions = Object.values(agentData.transitions || {});
      transitions.forEach(targetName => {
        if (typeof targetName === 'string' && adjacencyList.has(targetName)) {
          const neighbors = adjacencyList.get(name) || [];
          if (!neighbors.includes(targetName)) {
            neighbors.push(targetName);
          }
        }
      });
    });

    // Calculate hierarchical levels using BFS from start node
    const levels = new Map<string, number>();
    const orphanedNodes = new Set<string>(nodeNames);
    
    if (agent_graph.start_node && adjacencyList.has(agent_graph.start_node)) {
      const queue: Array<{ node: string; level: number }> = [{ node: agent_graph.start_node, level: 0 }];
      const visited = new Set<string>();
      
      while (queue.length > 0) {
        const { node, level } = queue.shift()!;
        
        if (visited.has(node)) continue;
        visited.add(node);
        orphanedNodes.delete(node);
        
        levels.set(node, level);
        
        const neighbors = adjacencyList.get(node) || [];
        neighbors.forEach(neighbor => {
          if (!visited.has(neighbor)) {
            queue.push({ node: neighbor, level: level + 1 });
          }
        });
      }
    }

    // Group nodes by level
    const nodesByLevel = new Map<number, string[]>();
    levels.forEach((level, nodeName) => {
      if (!nodesByLevel.has(level)) {
        nodesByLevel.set(level, []);
      }
      nodesByLevel.get(level)!.push(nodeName);
    });

    // Calculate positions for connected nodes
    const nodePositions = new Map<string, { x: number; y: number }>();
    const levelSpacing = 400; // Horizontal spacing between levels
    const nodeSpacing = 350;  // Vertical spacing between nodes in same level
    const startX = 100;
    const startY = 100;

    // Position connected nodes level by level (horizontal flow)
    const sortedLevels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);
    sortedLevels.forEach(level => {
      const nodesInLevel = nodesByLevel.get(level)!;
      const levelHeight = (nodesInLevel.length - 1) * nodeSpacing;
      const levelStartY = startY - levelHeight / 2;
      
      nodesInLevel.forEach((nodeName, index) => {
        nodePositions.set(nodeName, {
          x: startX + level * levelSpacing,
          y: levelStartY + index * nodeSpacing
        });
      });
    });

    // Position orphaned nodes to the right of the main graph
    const orphanedArray = Array.from(orphanedNodes);
    if (orphanedArray.length > 0) {
      const maxLevel = Math.max(...Array.from(levels.values()), -1);
      const orphanStartX = startX + (maxLevel + 2) * levelSpacing;
      const orphanRows = Math.ceil(Math.sqrt(orphanedArray.length));
      
      orphanedArray.forEach((nodeName, index) => {
        const row = index % orphanRows;
        const col = Math.floor(index / orphanRows);
        nodePositions.set(nodeName, {
          x: orphanStartX + col * levelSpacing,
          y: startY + row * nodeSpacing
        });
      });
    }

    // Process nodes from the imported graph with calculated positions
    nodeNames.forEach((name) => {
      const agentData = agent_graph.agents[name];
      const existingNode = existingNodesMap.get(name);
      const calculatedPosition = nodePositions.get(name) || { x: startX, y: startY };

      if (existingNode) {
        // Update existing node, preserving its ID but using calculated position
        const updatedNode: AgentNode = {
          ...existingNode,
          ...agentData,
          name: name, // Ensure name is correct
          position: calculatedPosition
        };
        updatedNodes.push(updatedNode);
        usedIds.add(existingNode.id);
      } else {
        // It's a new node, create it with calculated position
        const newNode: AgentNode = {
          id: crypto.randomUUID(),
          name: name,
          type: agentData.type,
          initial_prompt: agentData.initial_prompt,
          tools: agentData.tools,
          force_tool_call: agentData.force_tool_call,
          transitions: agentData.transitions,
          position: calculatedPosition
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