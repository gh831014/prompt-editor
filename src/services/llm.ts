import { supabase } from '@/lib/supabase';

export interface LLMConfig {
  provider_id: string;
  provider_name: string;
  base_url: string;
  api_key: string;
  model_id: string;
  model_name: string;
  model_type: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class LLMService {
  /**
   * 从数据库获取默认大模型配置，如果失败则使用硬编码的千问模型作为默认值
   */
  async getDefaultConfig(): Promise<LLMConfig | null> {
    try {
      const { data, error } = await supabase
        .from('llm_providers')
        .select(`
          id,
          name,
          base_url,
          api_key,
          llm_models!inner(
            id,
            model_id,
            model_name,
            model_type
          )
        `)
        .eq('is_default', true)
        .eq('is_active', true)
        .eq('llm_models.is_default', true)
        .eq('llm_models.is_active', true)
        .single();

      if (!error && data) {
        const model = Array.isArray(data.llm_models) ? data.llm_models[0] : data.llm_models;
        return {
          provider_id: data.id,
          provider_name: data.name,
          base_url: data.base_url,
          api_key: data.api_key,
          model_id: model.model_id,
          model_name: model.model_name,
          model_type: model.model_type,
        };
      }
    } catch (err) {
      console.warn('Database fetch for LLM config failed, using hardcoded default:', err);
    }

    // 默认使用用户提供的千问模型参数
    return {
      provider_id: 'qwen-default',
      provider_name: '千问',
      base_url: 'https://coding.dashscope.aliyuncs.com/v1',
      api_key: 'sk-sp-3ddae8d35c224c59a41d01079fe88f21',
      model_id: 'qwen3.5-plus',
      model_name: 'Qwen 3.5 Plus',
      model_type: 'chat',
    };
  }

  /**
   * 调用大模型 API (通过服务器代理以避免跨域问题)
   */
  async chat(messages: ChatMessage[], config?: LLMConfig): Promise<string> {
    // 如果没有提供配置，从数据库获取默认配置
    const llmConfig = config || await this.getDefaultConfig();
    
    if (!llmConfig) {
      throw new Error('未找到 LLM 配置 (LLM configuration not found)');
    }

    try {
      // 使用本地服务器代理调用，避免浏览器直接调用产生的跨域(CORS)错误
      const response = await fetch('/api/llm/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseUrl: llmConfig.base_url,
          apiKey: llmConfig.api_key,
          modelId: llmConfig.model_id,
          messages: messages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API Error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error: any) {
      console.error('LLM API call failed:', error);
      throw error;
    }
  }

  /**
   * 便捷方法：简单问答
   */
  async ask(question: string, systemPrompt?: string): Promise<string> {
    const messages: ChatMessage[] = [];
    
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }
    
    messages.push({
      role: 'user',
      content: question,
    });

    return this.chat(messages);
  }
}

// 导出单例
export const llmService = new LLMService();
