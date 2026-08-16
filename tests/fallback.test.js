import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLocalFallbackReply, createMessages } from '../server/controllers/chatController.js';
import { getAiProviderSettings } from '../config/env.js';

test('returns safety-focused guidance for breathing symptoms', () => {
    const reply = generateLocalFallbackReply('I am wheezing and short of breath', []);
    assert.match(reply, /wheezing|medical|urgent|seek/i);
});

test('returns general advice for heat and air quality concerns', () => {
    const reply = generateLocalFallbackReply('The air feels very hot and polluted today', []);
    assert.match(reply, /heat|air quality|hydrated|cool|indoor/i);
});

test('supports switching between OpenAI and local Ollama providers', () => {
    const openAi = getAiProviderSettings('openai');
    const ollama = getAiProviderSettings('ollama');

    assert.equal(openAi.provider, 'openai');
    assert.equal(ollama.provider, 'ollama');
    assert.equal(ollama.ollamaBaseUrl, 'http://localhost:11434');
    assert.ok(createMessages([], 'hello').length >= 2);
});
