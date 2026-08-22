FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache ca-certificates \
	&& update-ca-certificates

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server/server.js"]
