
// components/NodePalette.tsx
import { MessageCircle, Cog } from 'lucide-react';
interface NodePaletteProps {
  onDragStart: (e: React.DragEvent, nodeType: 'conversational' | 'tool_execution') => void;
}
export const NodePalette: React.FC<NodePaletteProps> = ({ onDragStart }) => (
    <div className="w-64 bg-white border-r border-gray-200 p-4 flex-shrink-0">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Node Palette</h2>
      <div className="space-y-3">
        <div draggable onDragStart={(e) => e.dataTransfer.setData('application/json', JSON.stringify({ nodeType: 'conversational' }))} className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg cursor-move hover:bg-blue-100 hover:border-blue-300 transition-colors group">
          <div className="flex items-center space-x-3"><MessageCircle className="w-6 h-6 text-blue-600" /><div><h3 className="font-medium text-blue-800">Conversational Agent</h3><p className="text-sm text-blue-600">Handles dialogue</p></div></div>
        </div>
        <div draggable onDragStart={(e) => e.dataTransfer.setData('application/json', JSON.stringify({ nodeType: 'tool_execution' }))} className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg cursor-move hover:bg-purple-100 hover:border-purple-300 transition-colors group">
          <div className="flex items-center space-x-3"><Cog className="w-6 h-6 text-purple-600" /><div><h3 className="font-medium text-purple-800">Tool Agent</h3><p className="text-sm text-purple-600">Executes functions</p></div></div>
        </div>
      </div>
    </div>
);
