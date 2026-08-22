# LifeLine AI

LifeLine AI is a breathing-risk web app for monitoring environmental conditions and getting AI-assisted guidance.

## Features
- Risk scoring for temperature, humidity, air quality, stress, and activity
- Local chat assistant with fallback support
- New Zealand / Auckland timezone-aware assistance

## Project structure
- public/ - static frontend assets and dashboard UI
- src/
  - risk/ - risk scoring and risk classification
  - validation/ - human-friendly temperature, humidity, air quality, and stress validation
  - time.js - timezone helper logic
- server/ - Express app, routes, and controllers
- config/ - environment configuration
- scripts/ - local Chroma and utility scripts
- tests/ - regression tests
- documents/ - user PDF source documents for the RAG workflow

## Run locally
1. Install dependencies: npm install
2. Start the server: npm start
3. Open http://localhost:3000

## Environment
Create a .env file with:
- OPENAI_API_KEY=your_key_here
- OPENAI_MODEL=gpt-5.4-mini

## Deploy on a cloud VM
The repository includes `compose.yaml` for running the app behind a public HTTPS hostname with automatic Let's Encrypt certificates. Caddy is configured directly in Compose.

1. Create a DNS `A` record for your hostname, such as `app.example.com`, pointing to the VM's public IPv4 address.
2. Allow inbound TCP ports 80 and 443 in the VM/cloud firewall. Keep SSH restricted to your own IP where possible.
3. Install Docker Engine and the Compose plugin on the VM, then authenticate to GHCR if the image is private.
4. Create `/etc/lifeline/lifeline.env` on the VM:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.4-mini
PORT=3000
```

5. From the repository directory on the VM, start the stack. Replace the owner and hostname with your values:

```bash
export LIFELINE_IMAGE=ghcr.io/OWNER/lifeline-ai:latest
export DOMAIN=app.example.com
docker compose pull
docker compose up -d
```

Caddy validates the hostname and obtains the certificate automatically. The DNS record must already resolve to the VM, and ports 80/443 must be reachable for certificate issuance. Verify the deployment at `https://app.example.com/health`.


