export function calculateRiskScore(inputs = {}) {
  const { temp = 0, humidity = 0, airq = 0, activity = 0, stress = 0 } = inputs;

  let risk = 0;

  if (humidity > 70) risk += 1.9;
  if (humidity < 30) risk += 1.1;
  if (temp < 10) risk += 1.4;
  if (temp > 28) risk += 1.0;

  if (airq >= 301) risk += 3.2;
  else if (airq >= 201) risk += 2.8;
  else if (airq >= 151) risk += 2.2;
  else if (airq >= 101) risk += 1.5;
  else if (airq >= 51) risk += 0.8;

  if (activity >= 4) risk += 1.7;
  if (stress >= 76) risk += 2.4;
  else if (stress >= 51) risk += 1.6;
  else if (stress >= 26) risk += 0.8;

  if (activity >= 3 && airq >= 101) risk += 0.9;
  if (stress >= 76 && humidity > 70) risk += 0.8;
  if (temp < 8 || temp > 32) risk += 0.6;
  if (humidity > 80 || humidity < 25) risk += 0.5;

  return Math.min(10, Math.max(0, Number(risk.toFixed(1))));
}

export function getRiskBand(risk) {
  if (risk >= 7.5) return 'critical';
  if (risk >= 4.5) return 'elevated';
  return 'safe';
}

export function getBandMeta(risk) {
  const band = getRiskBand(risk);
  const map = {
    safe: {
      label: 'Comfortable range',
      summary: 'Conditions look balanced and breathing should feel manageable.',
      emoji: '💚',
      color: '#4caf50'
    },
    elevated: {
      label: 'Watch closely',
      summary: 'A few factors are pushing the environment toward a less comfortable range.',
      emoji: '🟡',
      color: '#ffb300'
    },
    critical: {
      label: 'High concern',
      summary: 'Several conditions are combining to create a more demanding breathing environment.',
      emoji: '🔴',
      color: '#ff5b5b'
    }
  };

  return map[band];
}
