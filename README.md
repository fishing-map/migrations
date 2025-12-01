# 🗄️ Migrations - Banco de Dados FishingMap

## 📋 Visão Geral

Este projeto gerencia as migrations do banco de dados PostgreSQL de forma **independente** do back-end.

### ✨ Características

- ✅ **Totalmente independente** do back-end
- ✅ **Versionamento semântico** (Flyway style)
- ✅ **Pipeline automática** de deploy
- ✅ **Rollback seguro** com arquivos `.down.sql`
- ✅ **Jobs Kubernetes** com nomes únicos (sem conflitos)
- ✅ **Auditoria completa** de execuções

## 🏗️ Estrutura

```
migrations/
├── src/
│   ├── migrations/              # Arquivos SQL versionados
│   │   ├── V1.0.1__initial_schema.sql
│   │   ├── V1.0.1__initial_schema.down.sql
│   │   ├── V1.0.2__*.sql
│   │   └── ...
│   ├── run-migrations.ts        # Executor principal
│   └── create-migration.ts      # Helper para criar migrations
├── k8s/
│   └── migrations-job.yaml      # Job Kubernetes
├── .github/
│   └── workflows/
│       └── deploy-migrations.yml  # Pipeline CI/CD
├── Dockerfile                   # Imagem Docker
├── MIGRATION_GUIDE.md          # Guia completo (LEIA!)
└── README.md                   # Este arquivo
```

## 🚀 Quick Start

### 1. Criar Nova Migration

```bash
# Instalar dependências (primeira vez)
npm install

# Criar migration
npm run migration:create -- --name=add_comments_table

# Isso cria:
# - src/migrations/V1.0.X__add_comments_table.sql (UP)
# - src/migrations/V1.0.X__add_comments_table.down.sql (DOWN)
```

### 2. Escrever SQL

Edite os arquivos criados com suas queries SQL.

### 3. Testar Localmente

```bash
# Configurar .env com credenciais do banco local
cp .env.example .env

# Executar migrations
npm run migrate

# Testar rollback (opcional)
npm run migrate:undo
```

### 4. Deploy

```bash
git add src/migrations/
git commit -m "feat(db): add comments table"
git push origin main

# A pipeline automática será executada!
```

## 📝 Convenção de Nomenclatura

Todas as migrations seguem o padrão **Flyway Versioned** com **versionamento semântico**:

```
V<major>.<minor>.<patch>__<description>.sql
```

**Exemplos:**
```
V1.0.1__initial_schema.sql          # Patch - setup inicial
V1.0.2__add_user_columns.sql        # Patch - ajuste
V1.1.0__add_notifications.sql       # Minor - nova feature
V2.0.0__restructure_database.sql    # Major - breaking change
```

**Arquivo de Rollback:**
```
V1.0.1__initial_schema.down.sql
V1.1.0__add_notifications.down.sql
```

### 🔢 Versionamento

Controlado por `migration-version.json`:

- 🔴 **--major**: Breaking changes (ex: remover colunas, renomear tabelas)
- 🟡 **--minor**: Novas features (ex: adicionar tabelas, colunas nullable)
- 🟢 **(padrão)**: Bug fixes, ajustes menores

### ⚠️ Regras Importantes

- ✅ Sempre em ordem crescente (gerenciado automaticamente)
- ✅ **NUNCA** modificar migrations já executadas em produção
- ✅ Sempre criar arquivo `.down.sql` para rollback
- ✅ Usar `IF EXISTS` / `IF NOT EXISTS`
- ✅ Testar localmente antes de push
- ✅ Escolher tipo de versão correto

## 🔄 Pipeline Automática

A pipeline em `.github/workflows/deploy-migrations.yml` é executada:

### Triggers Automáticos:
- Push em `main` ou `develop` que modifica:
  - `src/migrations/**`
  - `src/run-migrations.ts`
  - `Dockerfile`
  - `package.json`

### Trigger Manual:
- Via GitHub Actions UI (workflow_dispatch)

### O que a Pipeline Faz:

1. ✅ Build da imagem Docker
2. ✅ Push para DigitalOcean Container Registry
3. ✅ Cria Job Kubernetes com **nome único** (`db-migrations-<timestamp>`)
4. ✅ Aguarda conclusão (timeout: 10min)
5. ✅ Verifica logs e status
6. ✅ Limpa jobs antigos (mantém últimos 5)

### Jobs com Nomes Únicos

**Por quê?**
- ❌ Jobs com mesmo nome geram conflitos no Kubernetes
- ✅ Jobs únicos permitem múltiplas execuções sem conflito
- ✅ Mantém histórico de execuções
- ✅ Facilita rollback

**Como funciona:**
```bash
# Gera nome único baseado em timestamp
JOB_NAME="db-migrations-$(date +%s)"

# Exemplo: db-migrations-1673456789
```

## 🛠️ Comandos Disponíveis

### Desenvolvimento

```bash
# Criar nova migration
npm run migration:create -- --name=add_fishing_spots

# Executar migrations pendentes
npm run migrate

# Ver status de migrations
npm run migrate:status

# Reverter última migration
npm run migrate:undo

# Reverter N migrations
npm run migrate:rollback-steps -- 3

# Voltar para versão específica
npm run migrate:rollback-to -- V1.0.5

# Build TypeScript
npm run build
```

### 🔄 Rollback Completo

Para guia detalhado de rollback, consulte: **[ROLLBACK_GUIDE.md](./ROLLBACK_GUIDE.md)**

### Docker Local

```bash
# Build
docker build -t migrations:local .

# Run
docker run --rm \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5432 \
  -e DB_NAME=fishing_map \
  -e DB_USER=postgres \
  -e DB_PASSWORD=postgres \
  -e DB_SSL=false \
  migrations:local
```

### Kubernetes

```bash
# Deploy manual (criar job único)
kubectl create job \
  db-migrations-manual-$(date +%s) \
  --from=cronjob/db-migrations \
  -n fishing-map

# Ver jobs
kubectl get jobs -n fishing-map -l app=migrations

# Ver logs
kubectl logs -l app=migrations -n fishing-map --tail=50

# Limpar jobs antigos
kubectl delete jobs -n fishing-map -l app=migrations --field-selector=status.successful=1
```

## 🏃 Workflow Completo - Exemplo

```bash
# 1. Criar branch
git checkout -b feat/add-notifications-table

# 2. Criar migration
cd migrations
npm run migration:create -- --name=add_notifications_table

# 3. Escrever SQL (editar arquivos gerados)
# - src/migrations/V1.0.X__add_notifications_table.sql
# - src/migrations/V1.0.X__add_notifications_table.down.sql

# 4. Testar localmente
npm run migrate
# Verificar no banco
npm run migrate:undo
npm run migrate

# 5. Commit
git add .
git commit -m "feat(db): add notifications table"
git push origin feat/add-notifications-table

# 6. Abrir PR no GitHub

# 7. Após merge na main
# → Pipeline automática é executada
# → Migration rodada no cluster

# 8. Verificar
kubectl get jobs -n fishing-map -l app=migrations
kubectl logs -l app=migrations -n fishing-map --tail=50
```

## 📚 Documentação Completa

Para guia detalhado sobre:
- Boas práticas
- Troubleshooting
- Rollback em produção
- Zero-downtime migrations
- Exemplos completos

**Leia:** [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) 📖

## 🔗 Integração com Back-end

### ⚠️ IMPORTANTE

O back-end (`fishing-map-server`) **NÃO** executa migrations!

- ✅ Migrations rodadas antes do deploy do back-end
- ✅ Back-end apenas conecta no banco já migrado
- ✅ TypeORM configurado com `migrations: []` e `migrationsRun: false`

### Ordem de Deploy:

```
1. Migrations (este projeto) → 2. Back-end
```

## 🛡️ Segurança

- ✅ Credenciais via Kubernetes Secrets
- ✅ SSL habilitado em produção
- ✅ Jobs rodando com usuário não-root
- ✅ Read-only filesystem (exceto logs)
- ✅ Resource limits definidos

## 📊 Monitoramento

Verificar status das migrations:

```sql
-- Conectar no banco
kubectl exec -it postgres-0 -n fishing-map -- psql -U postgres -d fishing_map

-- Ver todas migrations executadas
SELECT * FROM schema_migrations ORDER BY id;

-- Ver última migration
SELECT * FROM schema_migrations ORDER BY id DESC LIMIT 1;
```

## 🐛 Troubleshooting

### Migration falhou

```bash
# Ver logs
kubectl logs -l app=migrations -n fishing-map --tail=100

# Ver jobs com erro
kubectl get jobs -n fishing-map -l app=migrations

# Detalhes do job
kubectl describe job <job-name> -n fishing-map
```

### Resetar migrations (LOCAL APENAS!)

```bash
# CUIDADO! Isso deleta TODOS os dados
npm run migrate:undo  # Repetir até reverter todas

# Ou direto no banco
psql -h localhost -U postgres -d fishing_map -c "DROP TABLE schema_migrations;"
psql -h localhost -U postgres -d fishing_map -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

## 🤝 Contribuindo

1. Siga as convenções de nomenclatura
2. Sempre teste localmente
3. Sempre crie arquivo `.down.sql`
4. Documente breaking changes

## 📞 Suporte
- Issues: GitHub Issues do projeto
- DevOps: Consulte a equipe

---

**🚀 Happy Migrating!**

