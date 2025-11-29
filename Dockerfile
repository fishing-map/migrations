FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci --only=production

COPY src ./src

RUN npm run build

CMD ["node", "dist/run-migrations.js"]
