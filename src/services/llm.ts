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
   * 从数据库获取默认大模型配置
   */
  async getDefaultConfig(): Promise<LLMConfig | null> {
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

    if (error || !data) {
      console.error('Failed to fetch LLM config:', error);
      return null;
    }

    // The query returns an array for llm_models because of the join, but we expect one due to logic/schema usually.
    // However, supabase-js types might infer it as array or object depending on relationship.
    // Assuming one-to-many provider->models, but we filter by is_default.
    // Let's cast or handle safely.
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

  /**
   * 调用大模型 API
   */
  async chat(messages: ChatMessage[], config?: LLMConfig): Promise<string> {
    // 如果没有提供配置，从数据库获取默认配置
    const llmConfig = config || await this.getDefaultConfig();
    
    if (!llmConfig) {
      throw new Error('未找到 LLM 配置 (LLM configuration not found)');
    }

    try {
      const response = await fetch(`${llmConfig.base_url}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${llmConfig.api_key}`,
        },
        body: JSON.stringify({
          model: llmConfig.model_id,
          messages: messages,
          temperature: 0.7,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
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
