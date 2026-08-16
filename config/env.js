import dotenv from 'dotenv';

dotenv.config();

export function getAiProviderSettings(providerOverride = process.env.AI_PROVIDER) {
    const provider = (providerOverride || 'openai').toLowerCase();
    const mode = provider === 'ollama' ? 'ollama' : 'openai';

    return {
        port: Number(process.env.PORT || 3000),
        provider: mode,
        isOllama: mode === 'ollama',
        openAiApiKey: process.env.OPENAI_API_KEY || '',
        openAiModel: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
        ollamaBaseUrl: (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, ''),
        ollamaModel: process.env.OLLAMA_MODEL || 'llama3:latest',
        ollamaApiPath: process.env.OLLAMA_API_PATH || 'api/chat',
        timezone: 'Pacific/Auckland',
        locale: 'en-NZ'
    };
}

export const config = getAiProviderSettings();
