FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci

COPY src ./src

RUN npm run build

RUN npm prune --omit=dev

CMD ["node", "dist/run-migrations.js"]
