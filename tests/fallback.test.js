import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLocalFallbackReply, createMessages } from '../server/controllers/chatController.js';
import { getAiProviderSettings } from '../config/env.js';
import { validateHumanEnvironmentalInputs } from '../src/validation/environmentValidation.js';
import { calculateRiskScore } from '../src/risk/riskScoring.js';
import { describeWeatherCode, parseCoordinate } from '../server/controllers/environmentController.js';

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

test('passes the complete assessment scope to Smart AI messages', () => {
    const messages = createMessages([], 'Analyze my current breathing risk', {
        temperatureC: 20,
        humidityPercent: 55,
        airQualityIndex: 120,
        activityLevel: 4,
        activityScale: '1-5',
        stressLevel: 75,
        stressScale: '0-100',
        calculatedRiskScore: 4.1,
        riskBand: 'elevated',
        dataSource: 'Manual inputs'
    });

    assert.match(messages.at(-1).content, /temperatureC/);
    assert.match(messages.at(-1).content, /airQualityIndex/);
    assert.match(messages.at(-1).content, /activityScale/);
    assert.match(messages.at(-1).content, /stressScale/);
    assert.match(messages.at(-1).content, /calculatedRiskScore/);
});

test('accepts real AQI and stress ranges without invalidating the assessment', () => {
    const validation = validateHumanEnvironmentalInputs({
        temp: 20,
        humidity: 55,
        airq: 120,
        stress: 75
    });

    assert.equal(validation.valid, true);
    assert.ok(calculateRiskScore({ temp: 20, humidity: 55, airq: 120, activity: 2, stress: 75 }) > 0);
});

test('classifies hazardous AQI as critical even when other inputs are calm', () => {
    const risk = calculateRiskScore({ temp: 20, humidity: 55, airq: 500, activity: 1, stress: 0 });

    assert.equal(risk, 8);
});

test('accepts the full allowed temperature range from -15°C to 45°C', () => {
    const low = validateHumanEnvironmentalInputs({ temp: -15, humidity: 50, airq: 20, stress: 20 });
    const high = validateHumanEnvironmentalInputs({ temp: 45, humidity: 50, airq: 20, stress: 20 });

    assert.equal(low.valid, true);
    assert.equal(high.valid, true);
});

test('validates geolocation coordinates for Open-Meteo', () => {
    assert.equal(parseCoordinate('-36.8485', 'latitude', -90, 90), -36.8485);
    assert.throws(() => parseCoordinate('91', 'latitude', -90, 90), /latitude/);
    assert.throws(() => parseCoordinate('west', 'longitude', -180, 180), /longitude/);
});

test('describes common Open-Meteo weather codes', () => {
    assert.equal(describeWeatherCode(0), 'Clear sky');
    assert.equal(describeWeatherCode(61), 'Light rain');
    assert.equal(describeWeatherCode(999), 'Variable conditions');
});
