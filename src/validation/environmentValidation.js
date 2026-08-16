export function normalizeHumanValue(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

export function validateHumanEnvironmentalInputs(inputs = {}) {
  const normalized = {
    temp: normalizeHumanValue(inputs.temp, 0),
    humidity: normalizeHumanValue(inputs.humidity, 0),
    airq: normalizeHumanValue(inputs.airq, 0),
    stress: normalizeHumanValue(inputs.stress, 0)
  };

  const errors = [];
  const warnings = [];

  if (!Number.isFinite(Number(inputs.temp))) {
    errors.push('Temperature must be a valid number.');
  } else if (normalized.temp < -10 || normalized.temp > 45) {
    errors.push('Temperature should stay within a human-safe range of -10°C to 45°C.');
  } else if (normalized.temp < 8 || normalized.temp > 32) {
    warnings.push('Temperature is outside the most comfortable breathing range.');
  }

  if (!Number.isFinite(Number(inputs.humidity))) {
    errors.push('Humidity must be a valid number.');
  } else if (normalized.humidity < 10 || normalized.humidity > 100) {
    errors.push('Humidity should be between 10% and 100%.');
  } else if (normalized.humidity < 30 || normalized.humidity > 70) {
    warnings.push('Humidity is outside the calmer comfort range.');
  }

  if (!Number.isFinite(Number(inputs.airq))) {
    errors.push('Air quality must be a valid number.');
  } else if (normalized.airq < 1 || normalized.airq > 5) {
    errors.push('Air quality should be between 1 and 5.');
  } else if (normalized.airq >= 4) {
    warnings.push('Air quality is poor and may trigger breathing discomfort.');
  }

  if (!Number.isFinite(Number(inputs.stress))) {
    errors.push('Stress level must be a valid number.');
  } else if (normalized.stress < 1 || normalized.stress > 10) {
    errors.push('Stress should be between 1 and 10.');
  } else if (normalized.stress <= 3) {
    warnings.push('Stress is calm and breathing should feel stable.');
  } else if (normalized.stress >= 7) {
    warnings.push('Stress is high; slow breathing and rest are recommended.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    normalized
  };
}
