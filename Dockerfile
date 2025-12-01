FROM node:22-alpine

WORKDIR /app

# Instala apenas dependências essenciais
RUN npm install -g pnpm@8 && \
    apk add --no-cache postgresql-client

COPY package.json pnpm-lock.yaml ./
COPY tsconfig.json ./

RUN pnpm install --frozen-lockfile

COPY src ./src
RUN pnpm run build

# Remove dependências de dev
RUN pnpm prune --prod

CMD ["node", "dist/run-migrations.js"]

