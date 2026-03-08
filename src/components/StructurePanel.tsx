import React from 'react';
import { StructureItem } from '@/types';
import { Layers, GitBranch } from 'lucide-react';

interface StructurePanelProps {
  items: StructureItem[];
  onItemClick: (line: number) => void;
}

export const StructurePanel: React.FC<StructurePanelProps> = ({ items, onItemClick }) => {
  return (
    <div className="w-64 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center">
          <Layers className="w-4 h-4 mr-2" /> 结构大纲
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {items.length === 0 ? (
          <div className="text-xs text-gray-400 p-4 text-center">
            未检测到模块 (###) 或流程 (**...**)
          </div>
        ) : (
          <ul className="space-y-1">
            {items.map((item, index) => (
              <li
                key={index}
                onClick={() => onItemClick(item.line)}
                className={`text-xs p-2 rounded cursor-pointer hover:bg-gray-100 flex items-center ${
                  item.type === 'module' ? 'text-blue-700 bg-blue-50/50' : 'text-purple-700 bg-purple-50/50'
                }`}
              >
                {item.type === 'module' ? (
                  <Layers className="w-3 h-3 mr-2 flex-shrink-0 text-blue-500" />
                ) : (
                  <GitBranch className="w-3 h-3 mr-2 flex-shrink-0 text-purple-500" />
                )}
                <span className="truncate">{item.content}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
