const OPEN_METEO_WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';
const OPEN_METEO_AIR_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

function parseCoordinate(value, name, minimum, maximum) {
    const coordinate = Number(value);
    if (!Number.isFinite(coordinate) || coordinate < minimum || coordinate > maximum) {
        throw new Error(`${name} must be between ${minimum} and ${maximum}`);
    }
    return coordinate;
}

function firstNumber(value, fallback = null) {
    const candidate = Array.isArray(value) ? value[0] : value;
    return Number.isFinite(Number(candidate)) ? Number(candidate) : fallback;
}

function describeWeatherCode(code) {
    const descriptions = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Fog',
        48: 'Depositing rime fog',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        61: 'Light rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        71: 'Light snow',
        73: 'Moderate snow',
        75: 'Heavy snow',
        80: 'Rain showers',
        81: 'Moderate rain showers',
        82: 'Violent rain showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with light hail',
        99: 'Thunderstorm with heavy hail'
    };

    return descriptions[code] || 'Variable conditions';
}

async function fetchJson(url) {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
        throw new Error(`Open-Meteo request failed with status ${response.status}`);
    }
    return response.json();
}

async function getEnvironment(latitudeValue, longitudeValue) {
    const latitude = parseCoordinate(latitudeValue, 'latitude', -90, 90);
    const longitude = parseCoordinate(longitudeValue, 'longitude', -180, 180);
    const weatherParams = new URLSearchParams({
        latitude,
        longitude,
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m',
        timezone: 'auto'
    });
    const airParams = new URLSearchParams({
        latitude,
        longitude,
        current: 'us_aqi,pm2_5,pm10,ozone,dust,alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen',
        timezone: 'auto'
    });

    const [weather, airQuality] = await Promise.all([
        fetchJson(`${OPEN_METEO_WEATHER_URL}?${weatherParams}`),
        fetchJson(`${OPEN_METEO_AIR_URL}?${airParams}`)
    ]);

    const currentWeather = weather.current || {};
    const currentAir = airQuality.current || {};
    const temperature = Number(currentWeather.temperature_2m);
    const humidity = Number(currentWeather.relative_humidity_2m);
    const aqi = Number(currentAir.us_aqi);

    if (![temperature, humidity, aqi].every(Number.isFinite)) {
        throw new Error('Open-Meteo returned incomplete current conditions');
    }

    return {
        source: 'Open-Meteo',
        location: { latitude, longitude, timezone: weather.timezone || airQuality.timezone || 'auto' },
        weather: {
            temperature,
            humidity,
            apparentTemperature: Number(currentWeather.apparent_temperature),
            precipitation: Number(currentWeather.precipitation),
            windSpeed: Number(currentWeather.wind_speed_10m),
            code: Number(currentWeather.weather_code),
            description: describeWeatherCode(Number(currentWeather.weather_code)),
            time: currentWeather.time || null
        },
        airQuality: {
            usAqi: aqi,
            pm2_5: firstNumber(currentAir.pm2_5),
            pm10: firstNumber(currentAir.pm10),
            ozone: firstNumber(currentAir.ozone),
            dust: firstNumber(currentAir.dust),
            pollen: {
                alder: firstNumber(currentAir.alder_pollen),
                birch: firstNumber(currentAir.birch_pollen),
                grass: firstNumber(currentAir.grass_pollen),
                mugwort: firstNumber(currentAir.mugwort_pollen),
                olive: firstNumber(currentAir.olive_pollen),
                ragweed: firstNumber(currentAir.ragweed_pollen)
            }
        }
    };
}

async function environmentHandler(req, res) {
    try {
        const environment = await getEnvironment(req.query.latitude, req.query.longitude);
        res.json(environment);
    } catch (error) {
        console.error('Environment service error:', error);
        res.status(400).json({ error: error.message || 'Unable to fetch current conditions' });
    }
}

export { environmentHandler, getEnvironment, parseCoordinate, describeWeatherCode };
