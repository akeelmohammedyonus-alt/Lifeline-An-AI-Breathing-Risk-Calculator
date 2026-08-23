import OpenAI from 'openai';
import { config } from '../../config/env.js';

const openai = new OpenAI({ apiKey: config.openAiApiKey });

function createMessages(history, message, assessment = null) {
    const assessmentContext = assessment ? `\n\nStructured assessment data (use every field; activity is scored 1-5 and stress 0-100):\n${JSON.stringify(assessment)}` : '';
    return [
        {
            role: 'system',
            content: 'You are LifeLine AI, a breathing risk assistant for New Zealand users. Use Auckland/New Zealand local time context when relevant and provide safe, helpful advice about humidity, air quality, exercise, stress, temperature, asthma triggers, and breathing risk.'
        },
        ...history.flatMap((item) => [
            { role: 'user', content: item.user },
            { role: 'assistant', content: item.ai }
        ]),
        { role: 'user', content: `${message}${assessmentContext}` }
    ];
}

async function getOpenAIReply(messages) {
    const completion = await openai.responses.create({
        model: config.openAiModel,
        input: messages,
        max_output_tokens: 320,
        temperature: 0.7,
        store: true
    });

    return completion.output_text?.trim() || 'Sorry, I could not generate a reply.';
}

async function getOllamaReply(messages) {
    const systemMessage = messages.find((msg) => msg.role === 'system');
    const promptMessages = messages.filter((msg) => msg.role !== 'system');
    const fallbackPrompt = promptMessages
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join('\n');

    let resolvedModel = config.ollamaModel;

    try {
        const tagsResponse = await fetch(`${config.ollamaBaseUrl}/api/tags`);
        if (tagsResponse.ok) {
            const tagsData = await tagsResponse.json();
            const installedModels = (tagsData.models || []).map((model) => model.name || model.model || '').filter(Boolean);
            const requestedBase = config.ollamaModel.replace(/:latest$/i, '');
            const exactMatch = installedModels.find((name) => name === config.ollamaModel || name.startsWith(`${config.ollamaModel}:`));
            const aliasMatch = installedModels.find((name) => name === requestedBase || name.startsWith(`${requestedBase}:`));
            const fallbackMatch = installedModels[0];

            if (exactMatch) {
                resolvedModel = exactMatch;
            } else if (aliasMatch) {
                resolvedModel = aliasMatch;
            } else if (fallbackMatch) {
                resolvedModel = fallbackMatch;
            } else {
                throw new Error(`Ollama model "${config.ollamaModel}" is not installed. Run: ollama pull ${config.ollamaModel}`);
            }
        }
    } catch (error) {
        if (error.message?.includes('not installed')) {
            throw error;
        }
    }

    const attempts = [
        {
            url: `${config.ollamaBaseUrl}/${config.ollamaApiPath || 'api/chat'}`,
            body: {
                model: resolvedModel,
                messages,
                stream: false,
                options: { temperature: 0.7 }
            }
        },
        {
            url: `${config.ollamaBaseUrl}/api/generate`,
            body: {
                model: resolvedModel,
                system: systemMessage?.content || 'You are LifeLine AI, a breathing risk assistant.',
                prompt: fallbackPrompt,
                stream: false,
                options: { temperature: 0.7 }
            }
        }
    ];

    let lastError = null;

    for (const attempt of attempts) {
        try {
            const response = await fetch(attempt.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(attempt.body)
            });

            if (!response.ok) {
                const errorText = await response.text();
                lastError = new Error(`Ollama request failed: ${response.status} ${errorText || ''}`.trim());
                continue;
            }

            const data = await response.json();
            if (attempt.url.includes('/api/chat')) {
                return data.message?.content?.trim() || 'Sorry, I could not generate a reply.';
            }

            return data.response?.trim() || 'Sorry, I could not generate a reply.';
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error('Ollama request failed');
}

function generateLocalFallbackReply(message, history = []) {
    const text = (message || '').toLowerCase();
    const nzTime = new Intl.DateTimeFormat('en-NZ', {
        timeZone: 'Pacific/Auckland',
        dateStyle: 'full',
        timeStyle: 'short'
    }).format(new Date());

    let reply = `I’m here to help with general breathing and environmental safety guidance for Auckland/New Zealand. Current local time is ${nzTime}. If you have chest pain, severe shortness of breath, blue lips, fainting, or worsening symptoms, seek urgent medical help right away.`;

    if (text.includes('wheez') || text.includes('shortness') || text.includes('breath') || text.includes('asthma')) {
        reply = `If you’re having wheezing, chest tightness, or shortness of breath, please avoid exertion and seek medical advice promptly. If symptoms are severe or worsening, call emergency services immediately. Local time in Auckland is ${nzTime}.`;
    } else if (text.includes('heat') || text.includes('hot') || text.includes('humid') || text.includes('air quality') || text.includes('pollut')) {
        reply = `For heat, humidity, or poor air quality, move to a cooler or cleaner indoor space, stay hydrated, and avoid heavy activity. If you feel dizzy, very short of breath, or your symptoms are worsening, seek urgent care. Current Auckland time is ${nzTime}.`;
    } else if (text.includes('stress') || text.includes('anx') || text.includes('panic')) {
        reply = `If stress or panic is contributing to your symptoms, try slow breathing in a calm space, reduce triggers, and reach out to a trusted clinician if symptoms continue. Auckland time: ${nzTime}.`;
    } else if (text.includes('exercise') || text.includes('workout') || text.includes('activity')) {
        reply = `For exercise-related breathing concerns, slow down, rest, and avoid pushing through symptoms. If you’re having significant breathlessness or chest discomfort, seek urgent medical advice. Auckland time: ${nzTime}.`;
    }

    if (history.length > 0) {
        reply += ' I can also help you review your recent symptoms and environment in a simple, safe way.';
    }

    return reply;
}

async function chatHandler(req, res) {
    const { message = '', history = [], assessment = null } = req.body || {};

    try {
        const messages = createMessages(history, message, assessment);
        const reply = config.isOllama ? await getOllamaReply(messages) : await getOpenAIReply(messages);
        res.json({ reply, provider: config.provider });
    } catch (error) {
        console.error('AI server error:', error);
        const fallbackReply = generateLocalFallbackReply(message, history);
        res.status(200).json({ reply: fallbackReply, fallback: true, provider: config.provider });
    }
}

export { chatHandler, generateLocalFallbackReply, createMessages, getOpenAIReply, getOllamaReply };
