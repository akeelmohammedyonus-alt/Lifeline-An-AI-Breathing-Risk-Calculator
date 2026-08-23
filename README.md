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
The repository includes `compose.yaml` for running the app behind the existing `nginx-proxy` and `acme-companion` containers. The app does not publish a host port, so it does not conflict with services using ports 80 and 443. It joins the proxy's Docker network and registers the hostname for automatic HTTPS.

1. Create a DNS `A` record for `lifelinebrc.ddns.net` pointing to the VM's public IPv4 address.
2. Find the Docker network used by the existing proxy:

```bash
sudo docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}'
sudo docker inspect EXISTING_PROXY_CONTAINER --format '{{range $name, $network := .NetworkSettings.Networks}}{{$name}}{{"\n"}}{{end}}'
```

Use the network name returned by the second command as `PROXY_NETWORK` below.

3. The Compose variables below configure `nginx-proxy` to route `lifelinebrc.ddns.net` to port 3000 and configure `acme-companion` to request a trusted Let's Encrypt certificate.
4. Allow inbound TCP ports 80 and 443 in the VM/cloud firewall. Keep SSH restricted to your own IP where possible.
5. Install Docker Engine and the Compose plugin on the VM, then authenticate to GHCR if the image is private.
6. From the directory containing `compose.yaml`, create `lifeline.env`:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.4-mini
PORT=3000
```

7. Create `.env` beside `compose.yaml`:

```env
LIFELINE_IMAGE=ghcr.io/YOUR_GITHUB_OWNER/lifeline-ai:latest
PROXY_NETWORK=YOUR_EXISTING_PROXY_NETWORK
DOMAIN=lifelinebrc.ddns.net
LETSENCRYPT_EMAIL=your-email@example.com
```

8. Start the app:

```bash
chmod 600 lifeline.env .env
docker compose pull
docker compose up -d
```

Verify the public URL at `https://lifelinebrc.ddns.net/health`. Check the container with `docker compose ps` and `docker compose logs --tail=100 app`. The existing proxy should discover the app through `VIRTUAL_HOST=lifelinebrc.ddns.net` and `VIRTUAL_PORT=3000`.

### Combined Nextcloud deployment
If the VM already runs the Nextcloud stack from the original Compose project, use `docker-compose.nextcloud.yml` instead of the standalone `compose.yaml`. Copy it into the original Nextcloud Compose directory, where `proxy/`, `db.env`, and the named volumes are already configured.

Create `lifeline.env` in that same directory:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.4-mini
PORT=3000
```

Create or update the original Compose `.env` with:

```env
MYSQL_ROOT_PASSWORD=use-a-strong-password
```

Then run:

```bash
sudo /usr/local/bin/docker-compose -f docker-compose.nextcloud.yml config
sudo /usr/local/bin/docker-compose -f docker-compose.nextcloud.yml pull lifeline
sudo /usr/local/bin/docker-compose -f docker-compose.nextcloud.yml up -d --force-recreate lifeline proxy letsencrypt-companion
```

The combined file registers `lifelinebrc.ddns.net` automatically with `nginx-proxy` and `acme-companion`; do not run the standalone LifeLine Compose stack at the same time.


