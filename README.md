# Migrations - Banco de Dados FishingMap

Este projeto contém as migrations do banco de dados PostgreSQL.

## Estrutura

```
migrations/
├── Dockerfile              # Build da imagem de migrations
├── package.json            # Dependências Node.js
├── tsconfig.json           # Configuração TypeScript
├── src/
│   └── migrations/         # Arquivos de migration
└── run-migrations.ts       # Script principal
```

## Executar Localmente

```bash
# Instalar dependências
npm install

# Executar migrations
npm run migrate

# Reverter última migration
npm run migrate:undo
```

## Build e Deploy

```bash
# Build da imagem
docker build -t registry.digitalocean.com/fishing-map-prod/migrations:latest .

# Push para registry
docker push registry.digitalocean.com/fishing-map-prod/migrations:latest

# Executar no Kubernetes
kubectl apply -f ../infrastructure/k8s/migrations-job.yaml
```

## Adicionar Nova Migration

```bash
npm run migration:create -- --name=nome-da-migration
```
