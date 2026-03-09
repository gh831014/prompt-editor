import React, { useState, useEffect, useRef } from 'react';
import { Prompt, StructureItem } from '@/types';
import { supabase } from '@/lib/supabase';
import { Sidebar } from '@/components/Sidebar';
import { StructurePanel } from '@/components/StructurePanel';
import { AIChat } from '@/components/AIChat';
import { Button, Input } from '@/components/ui';
import { Save, Download, Upload, Database, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const PromptEditor: React.FC = () => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState<Prompt | null>(null);
  const [dbStatus, setDbStatus] = useState<'connected' | 'disconnected' | 'loading'>('loading');
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [structure, setStructure] = useState<StructureItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Parse structure function
  const parseStructure = (text: string) => {
    const lines = text.split('\n');
    const items: StructureItem[] = [];

    lines.forEach((line, index) => {
      // Module: ### Function Name
      const moduleMatch = line.match(/^###\s+(.+)/);
      if (moduleMatch) {
        items.push({
          type: 'module',
          content: moduleMatch[1].trim(),
          line: index,
        });
      }

      // Logic Flow: ** Logic Name **
      const flowMatch = line.match(/\*\*\s*(.+?)\s*\*\*/);
      if (flowMatch) {
        items.push({
          type: 'flow',
          content: flowMatch[1].trim(),
          line: index,
        });
      }
    });

    setStructure(items);
  };

  // Fetch prompts on mount
  useEffect(() => {
    fetchPrompts();
  }, []);

  // Parse structure when content changes
  useEffect(() => {
    parseStructure(content);
  }, [content]);

  const fetchPrompts = async () => {
    setDbStatus('loading');
    try {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPrompts(data || []);
      setDbStatus('connected');
    } catch (err) {
      console.error('Error fetching prompts:', err);
      setDbStatus('disconnected');
      setError('连接数据库失败');
    }
  };

  const handleSelectPrompt = (prompt: Prompt) => {
    setCurrentPrompt(prompt);
    setTitle(prompt.title);
    setContent(prompt.content || '');
    setError(null);
  };

  const handleNewPrompt = () => {
    setCurrentPrompt(null);
    setTitle('新提示词');
    setContent('');
    setError(null);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('标题不能为空');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const promptData = {
        title,
        content,
        summary: content.slice(0, 100) + '...', // Simple summary
        version: 'v1.0',
      };

      let savedPrompt: Prompt;

      if (currentPrompt?.id) {
        // Update existing
        const { data, error } = await supabase
          .from('prompts')
          .update(promptData)
          .eq('id', currentPrompt.id)
          .select()
          .single();

        if (error) throw error;
        savedPrompt = data;

        setPrompts((prev) => {
            const index = prev.findIndex((p) => p.id === savedPrompt.id);
            if (index >= 0) {
              const newPrompts = [...prev];
              newPrompts[index] = savedPrompt;
              return newPrompts;
            }
            return prev;
        });
      } else {
        // Create new
        const { data, error } = await supabase
          .from('prompts')
          .insert([promptData])
          .select()
          .single();

        if (error) throw error;
        savedPrompt = data;
        
        setPrompts((prev) => [savedPrompt, ...prev]);
      }

      setCurrentPrompt(savedPrompt);
    } catch (err: any) {
      console.error('Error saving prompt:', err);
      setError(err.message || '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePrompt = async (id: number) => {
    if (!confirm('确定要删除这个提示词吗？')) return;

    try {
      const { error } = await supabase.from('prompts').delete().eq('id', id);
      if (error) throw error;

      setPrompts((prev) => prev.filter((p) => p.id !== id));
      if (currentPrompt?.id === id) {
        handleNewPrompt();
      }
    } catch (err: any) {
      console.error('Error deleting prompt:', err);
      setError(err.message || '删除失败');
    }
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setContent(text);
      setTitle(file.name.replace(/\.(md|txt)$/, ''));
      setCurrentPrompt(null); // Treat as new prompt
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'prompt'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const scrollToLine = (lineIndex: number) => {
    if (textareaRef.current) {
      const lineHeight = 24; // Approximate line height in pixels
      textareaRef.current.scrollTop = lineIndex * lineHeight;
      textareaRef.current.focus();
      
      // Highlight logic could go here, but scrolling is a good start
      const text = textareaRef.current.value;
      const lines = text.split('\n');
      let charIndex = 0;
      for (let i = 0; i < lineIndex; i++) {
        charIndex += lines[i].length + 1; // +1 for newline
      }
      textareaRef.current.setSelectionRange(charIndex, charIndex + lines[lineIndex].length);
    }
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        prompts={prompts}
        currentPromptId={currentPrompt?.id || null}
        onSelectPrompt={handleSelectPrompt}
        onNewPrompt={handleNewPrompt}
        onDeletePrompt={handleDeletePrompt}
        onImport={handleImport}
        dbStatus={dbStatus}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4 bg-white">
          <div className="flex-1 max-w-2xl">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="提示词标题"
              className="text-lg font-semibold border-transparent focus:border-blue-500 px-0"
            />
          </div>
          <div className="flex items-center space-x-2">
            {error && <span className="text-red-500 text-sm mr-2">{error}</span>}
            <Button onClick={handleExport} variant="secondary" size="sm" title="导出">
              <Download className="w-4 h-4" />
            </Button>
            <Button onClick={() => navigator.clipboard.writeText(content)} variant="secondary" size="sm" title="复制到剪贴板">
              <span className="text-xs">复制</span>
            </Button>
            <Button onClick={handleSave} disabled={isSaving} size="sm">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              保存
            </Button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Editor */}
          <div className="flex-1 flex flex-col border-r border-gray-200">
            <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 border-b border-gray-200">
              编辑器 (Markdown)
            </div>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1 w-full p-4 resize-none focus:outline-none font-mono text-sm leading-6"
              placeholder="在此输入提示词... 使用 ### 标记模块，使用 ** 标记逻辑流程。"
            />
          </div>

          {/* Preview */}
          <div className="flex-1 flex flex-col bg-gray-50/50 hidden lg:flex">
            <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 border-b border-gray-200">
              预览
            </div>
            <div className="flex-1 overflow-y-auto p-8 prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Structure & AI */}
      <div className="flex flex-col border-l border-gray-200 w-80 bg-white">
        <div className="flex-1 overflow-hidden flex flex-col h-1/2 border-b border-gray-200">
          <StructurePanel items={structure} onItemClick={scrollToLine} />
        </div>
        <div className="flex-1 overflow-hidden flex flex-col h-1/2">
          <AIChat currentPromptContent={content} structure={structure} />
        </div>
      </div>
    </div>
  );
};
