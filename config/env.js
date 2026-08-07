import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: Number(process.env.PORT || 3000),
    openAiApiKey: process.env.OPENAI_API_KEY || '',
    openAiModel: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
    timezone: 'Pacific/Auckland',
    locale: 'en-NZ'
};
