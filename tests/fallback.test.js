import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLocalFallbackReply } from '../server/controllers/chatController.js';

test('returns safety-focused guidance for breathing symptoms', () => {
    const reply = generateLocalFallbackReply('I am wheezing and short of breath', []);
    assert.match(reply, /wheezing|medical|urgent|seek/i);
});

test('returns general advice for heat and air quality concerns', () => {
    const reply = generateLocalFallbackReply('The air feels very hot and polluted today', []);
    assert.match(reply, /heat|air quality|hydrated|cool|indoor/i);
});
