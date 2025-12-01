FROM node:22-alpine

WORKDIR /app

# Instalar pnpm globalmente e PostgreSQL client para wait-for-db
RUN npm install -g pnpm@8 && \
    apk add --no-cache postgresql-client

COPY package.json pnpm-lock.yaml ./
COPY tsconfig.json ./

RUN pnpm install --frozen-lockfile --prod=false

# Copy wait-for-db script
COPY wait-for-db.sh /wait-for-db.sh
RUN chmod +x /wait-for-db.sh

COPY src ./src

RUN pnpm run build

RUN pnpm prune --prod

CMD ["node", "dist/run-migrations.js"]
