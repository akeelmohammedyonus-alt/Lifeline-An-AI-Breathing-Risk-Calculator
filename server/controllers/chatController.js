import OpenAI from 'openai';
import { config } from '../../config/env.js';

const openai = new OpenAI({ apiKey: config.openAiApiKey });

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
    const { message = '', history = [] } = req.body || {};

    try {
        const input = [
            {
                role: 'system',
                content: 'You are LifeLine AI, a breathing risk assistant for New Zealand users. Use Auckland/New Zealand local time context when relevant and provide safe, helpful advice about humidity, air quality, exercise, stress, temperature, asthma triggers, and breathing risk.'
            },
            ...history.flatMap((item) => [
                { role: 'user', content: item.user },
                { role: 'assistant', content: item.ai }
            ]),
            { role: 'user', content: message }
        ];

        const completion = await openai.responses.create({
            model: config.openAiModel,
            input,
            max_output_tokens: 320,
            temperature: 0.7,
            store: true
        });

        const reply = completion.output_text?.trim() || 'Sorry, I could not generate a reply.';
        res.json({ reply });
    } catch (error) {
        console.error('AI server error:', error);
        const fallbackReply = generateLocalFallbackReply(message, history);
        res.status(200).json({ reply: fallbackReply, fallback: true });
    }
}

export { chatHandler, generateLocalFallbackReply };
