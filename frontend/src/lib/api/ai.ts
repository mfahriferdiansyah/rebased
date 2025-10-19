import { apiClient } from './client';
import type { Strategy } from '@/lib/types/strategy';

export interface GenerateStrategyRequest {
  intent: string;
  currentStrategy?: any;
  conversationHistory?: Array<{ role: string; content: string }>;
}

export class AiApi {
  /**
   * Generate strategy from natural language intent
   * @param intent - User's natural language request
   * @param token - JWT authentication token
   * @param currentStrategy - Current canvas strategy for context-aware modifications
   * @param conversationHistory - Chat history for conversation continuity
   */
  async generateStrategy(
    intent: string,
    token: string,
    currentStrategy?: any,
    conversationHistory?: Array<{ role: string; content: string }>,
  ): Promise<Strategy> {
    const response = await apiClient.post<Strategy>(
      '/ai/generate-strategy',
      {
        intent,
        currentStrategy,
        conversationHistory,
      },
      token,
    );
    return response;
  }
}

export const aiApi = new AiApi();
