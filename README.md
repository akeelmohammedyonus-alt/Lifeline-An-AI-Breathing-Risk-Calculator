# LifeLine AI

LifeLine AI is a breathing-risk web app for monitoring environmental conditions and getting AI-assisted guidance.

## Features
- Risk scoring for temperature, humidity, air quality, stress, and activity
- Local chat assistant with fallback support
- New Zealand / Auckland timezone-aware assistance

## Project structure
- public/ - static frontend assets
- src/ - shared app logic and helpers
- server/ - Express app, routes, and controllers
- config/ - environment configuration
- tests/ - regression tests

## Run locally
1. Install dependencies: npm install
2. Start the server: npm start
3. Open http://localhost:3000

## Environment
Create a .env file with:
- OPENAI_API_KEY=your_key_here
- OPENAI_MODEL=gpt-5.4-mini
