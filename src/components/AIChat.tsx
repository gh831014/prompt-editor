import React, { useState, useRef, useEffect } from 'react';
import { Button, Input } from '@/components/ui';
import { Send, Bot, User, Loader2, AtSign } from 'lucide-react';
import { llmService, ChatMessage } from '@/services/llm';
import { StructureItem } from '@/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatProps {
  currentPromptContent: string;
  structure: StructureItem[];
}

export const AIChat: React.FC<AIChatProps> = ({ currentPromptContent, structure }) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: '你好！我是你的 AI 助手。你可以输入 YH 开头进行专家优化，或使用 @ 提及特定模块。' },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAtMenu, setShowAtMenu] = useState(false);
  const [filteredStructure, setFilteredStructure] = useState<StructureItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);

    // Handle @ menu
    const lastAtPos = value.lastIndexOf('@');
    if (lastAtPos !== -1 && lastAtPos === value.length - 1) {
      setShowAtMenu(true);
      setFilteredStructure(structure);
    } else if (lastAtPos !== -1 && showAtMenu) {
      const query = value.slice(lastAtPos + 1).toLowerCase();
      setFilteredStructure(
        structure.filter(item => item.content.toLowerCase().includes(query))
      );
    } else {
      setShowAtMenu(false);
    }
  };

  const selectAtItem = (item: StructureItem) => {
    const lastAtPos = input.lastIndexOf('@');
    const newValue = input.slice(0, lastAtPos + 1) + item.content + ' ';
    setInput(newValue);
    setShowAtMenu(false);
    inputRef.current?.focus();
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let systemInstruction = '';
      let userPrompt = input;

      if (input.startsWith('YH')) {
        // Prompt Expert Mode
        systemInstruction = `你是一个专业的提示词专家。请对用户提供的提示词或模块进行排版、内容、表达含义准确性等方面的优化。
目标：表达准确，减少冗余 token 使用，提高安全性。
请以专家的角度给出优化后的版本和简要的优化说明。`;
        userPrompt = `请优化以下提示词内容：\n\n${input.slice(2).trim() || currentPromptContent}`;
      } else if (input.startsWith('@')) {
        // Module Specific Optimization
        const match = input.match(/^@(.+?)\s+(.*)/) || input.match(/^@(.+)/);
        const moduleName = match ? match[1] : '';
        const additionalRequest = match && match[2] ? match[2] : '';

        // Find module content
        const lines = currentPromptContent.split('\n');
        const moduleItem = structure.find(s => s.content === moduleName);
        let moduleContent = '';
        
        if (moduleItem) {
          const startIndex = moduleItem.line;
          // Find next module or end of content
          const nextModule = structure.find(s => s.line > startIndex);
          const endIndex = nextModule ? nextModule.line : lines.length;
          moduleContent = lines.slice(startIndex, endIndex).join('\n');
        }

        systemInstruction = `你是一个专业的提示词专家。请结合上下文和定义，对指定的模块或流程内容进行优化。
目标：表达准确，减少冗余 token 使用，提高安全性。
当前指定的模块名称: ${moduleName}
当前模块内容:
${moduleContent}

请以专家的角度对该模块进行优化。`;
        userPrompt = additionalRequest || `请优化模块 "${moduleName}"。`;
      } else {
        // Normal Mode
        systemInstruction = `你是一个专业的 AI 助手。请直接回答用户的问题。
如果用户询问某个名称的含义，请直接查询定义并输出。`;
      }

      const chatMessages: ChatMessage[] = [
        {
          role: 'system',
          content: systemInstruction + `\n\n当前完整提示词上下文:\n${currentPromptContent}`
        },
        ...messages.filter(m => m.role !== 'assistant' || m.id !== '1').map(m => ({
          role: m.role,
          content: m.content
        })),
        {
          role: 'user',
          content: userPrompt
        }
      ];

      const response = await llmService.chat(chatMessages);
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response || '无法生成回复。',
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error: any) {
      console.error('AI Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `抱歉，处理请求时遇到错误: ${error.message || '未知错误'}。`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 w-80 relative">
      <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center">
          <Bot className="w-4 h-4 mr-2 text-blue-600" /> AI 助手
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-gray-100 text-gray-800 rounded-bl-none'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3 rounded-bl-none">
              <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* @ Menu */}
      {showAtMenu && filteredStructure.length > 0 && (
        <div className="absolute bottom-16 left-2 right-2 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
          <div className="p-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-200">
            选择模块或流程
          </div>
          {filteredStructure.map((item, idx) => (
            <div
              key={idx}
              className="p-2 text-sm hover:bg-blue-50 cursor-pointer truncate flex items-center"
              onClick={() => selectAtItem(item)}
            >
              <AtSign className="w-3 h-3 mr-2 text-gray-400" />
              {item.content}
            </div>
          ))}
        </div>
      )}

      <div className="p-3 border-t border-gray-200 bg-white">
        <div className="flex space-x-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => e.key === 'Enter' && !showAtMenu && handleSend()}
            placeholder="输入 YH... 或 @模块..."
            className="flex-1 text-sm"
            disabled={isLoading}
          />
          <Button onClick={handleSend} size="icon" disabled={isLoading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
