export interface AgentNode {
  id: string;
  name: string;
  type: 'conversational' | 'tool_execution';
  initial_prompt: string;
  tools: string[];
  force_tool_call: boolean;
  transitions: Record<string, string>;
  position: { x: number; y: number };
}

export interface WorkflowState {
  start_node: string;
  agents: Record<string, Omit<AgentNode, 'id' | 'position'>>;
}

export interface Connection {
  from: string;
  to: string;
  condition: string;
  fromTerminal: { x: number; y: number };
  toTerminal: { x: number; y: number };
}

export interface ConnectionInProgress {
  fromNodeId: string;
  condition: string;
  startPosition: { x: number; y: number };
  currentPosition: { x: number; y: number };
}

export const AVAILABLE_TOOLS = [
  'git_tool',
  'file_system_tool',
  'web_scraper_tool',
  'email_tool',
  'database_tool',
  'api_tool',
  'image_processor_tool',
  'text_analyzer_tool'
];