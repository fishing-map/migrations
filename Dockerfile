FROM node:20-alpine

WORKDIR /app

# Instalar pnpm globalmente
RUN npm install -g pnpm@8

COPY package.json pnpm-lock.yaml ./
COPY tsconfig.json ./

RUN pnpm install --frozen-lockfile --prod=false

COPY src ./src

RUN pnpm run build

RUN pnpm prune --prod

CMD ["node", "dist/run-migrations.js"]
