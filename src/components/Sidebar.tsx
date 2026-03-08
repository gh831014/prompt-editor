import React from 'react';
import { Prompt } from '@/types';
import { Button } from '@/components/ui';
import { Plus, Trash2, Download, Upload, Database, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface SidebarProps {
  prompts: Prompt[];
  currentPromptId: number | null;
  onSelectPrompt: (prompt: Prompt) => void;
  onNewPrompt: () => void;
  onDeletePrompt: (id: number) => void;
  onImport: (file: File) => void;
  dbStatus: 'connected' | 'disconnected' | 'loading';
}

export const Sidebar: React.FC<SidebarProps> = ({
  prompts,
  currentPromptId,
  onSelectPrompt,
  onNewPrompt,
  onDeletePrompt,
  onImport,
  dbStatus,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImport(e.target.files[0]);
    }
  };

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">提示词编辑器</h2>
        <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
          {dbStatus === 'loading' ? (
            <span className="flex items-center text-yellow-600"><Database className="w-3 h-3 mr-1 animate-pulse" /> 连接中...</span>
          ) : dbStatus === 'connected' ? (
            <span className="flex items-center text-green-600"><CheckCircle className="w-3 h-3 mr-1" /> 已连接数据库</span>
          ) : (
            <span className="flex items-center text-red-600"><XCircle className="w-3 h-3 mr-1" /> 数据库错误</span>
          )}
        </div>
        <div className="flex space-x-2">
          <Button onClick={onNewPrompt} size="sm" className="flex-1" variant="primary">
            <Plus className="w-4 h-4 mr-1" /> 新建
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} size="sm" variant="secondary" title="导入">
            <Upload className="w-4 h-4" />
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".md,.txt"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {prompts.map((prompt) => (
          <div
            key={prompt.id}
            className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
              currentPromptId === prompt.id
                ? 'bg-blue-100 text-blue-900'
                : 'hover:bg-gray-100 text-gray-700'
            }`}
            onClick={() => onSelectPrompt(prompt)}
          >
            <div className="truncate text-sm font-medium flex-1 pr-2">
              {prompt.title || '无标题提示词'}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeletePrompt(prompt.id);
              }}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
              title="删除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {prompts.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-8">
            未找到提示词
          </div>
        )}
      </div>
    </div>
  );
};
