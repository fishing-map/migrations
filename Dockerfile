FROM node:20-alpine

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependências (npm ci se tiver lock, npm install caso contrário)
RUN if [ -f package-lock.json ]; then \
      echo "📦 Usando npm ci (package-lock.json encontrado)"; \
      npm ci; \
    else \
      echo "⚠️  package-lock.json não encontrado, usando npm install"; \
      npm install; \
    fi

# Copiar código fonte
COPY src ./src

# Compilar TypeScript
RUN npm run build

# Remover devDependencies (reduz tamanho da imagem)
RUN npm prune --omit=dev

# Executar migrations
CMD ["node", "dist/run-migrations.js"]
