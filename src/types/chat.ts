export interface ChatMessage {
    id: string;
    content: string;
    sender: 'user' | 'assistant';
    timestamp: Date;
    model?: string;
}

export interface Conversation {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: Date;
    updatedAt: Date;
    provider?: 'openai' | 'deepseek';
    model?: string;
}

export type MessageSender = 'user' | 'assistant';
export type AIProvider = 'openai' | 'deepseek'; 