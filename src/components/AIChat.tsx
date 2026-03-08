import React, { useState, useRef, useEffect } from 'react';
import { Button, Input } from '@/components/ui';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { llmService, ChatMessage } from '@/services/llm';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatProps {
  currentPromptContent: string;
}

export const AIChat: React.FC<AIChatProps> = ({ currentPromptContent }) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: '你好！我是你的 AI 助手。我可以帮你优化提示词结构、清晰度或具体模块。' },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      // Construct messages for LLM
      const chatMessages: ChatMessage[] = [
        {
          role: 'system',
          content: `你是一个专业的提示词优化助手。请根据用户提供的提示词内容和需求进行回答。
          
当前提示词内容:
${currentPromptContent}

请专注于：
1. 优化提示词结构
2. 提高表达清晰度
3. 完善逻辑流程
4. 建议缺失的模块`
        },
        ...messages.filter(m => m.role !== 'assistant' || m.id !== '1').map(m => ({
          role: m.role,
          content: m.content
        })),
        {
          role: 'user',
          content: input
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
        content: `抱歉，处理请求时遇到错误: ${error.message || '未知错误'}。请确保数据库中已配置默认 LLM 提供商。`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 w-80">
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
      <div className="p-3 border-t border-gray-200 bg-white">
        <div className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="询问 AI..."
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
