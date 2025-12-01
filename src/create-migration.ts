#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Script para criar nova migration com nomenclatura padronizada
 * Uso:
 *   npm run migration:create -- --name=add_user_table
 *   npm run migration:create -- --name=add_user_table --major (incrementa major version)
 *   npm run migration:create -- --name=add_user_table --minor (incrementa minor version)
 */

interface VersionConfig {
  currentMajor: number;
  currentMinor: number;
  currentPatch: number;
}

function loadVersionConfig(): VersionConfig {
  const configPath = path.join(__dirname, '..', 'migration-version.json');

  if (!fs.existsSync(configPath)) {
    // Criar configuração inicial
    const initialConfig: VersionConfig = {
      currentMajor: 1,
      currentMinor: 0,
      currentPatch: 0,
    };
    fs.writeFileSync(configPath, JSON.stringify(initialConfig, null, 2));
    return initialConfig;
  }

  const content = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(content) as VersionConfig;
}

function saveVersionConfig(config: VersionConfig): void {
  const configPath = path.join(__dirname, '..', 'migration-version.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function getNextVersion(incrementType: 'major' | 'minor' | 'patch' = 'patch'): string {
  const migrationsDir = path.join(__dirname, 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  const config = loadVersionConfig();

  // Incrementar versão conforme tipo
  switch (incrementType) {
    case 'major':
      config.currentMajor += 1;
      config.currentMinor = 0;
      config.currentPatch = 0;
      break;
    case 'minor':
      config.currentMinor += 1;
      config.currentPatch = 0;
      break;
    case 'patch':
    default:
      config.currentPatch += 1;
      break;
  }

  saveVersionConfig(config);

  return `V${config.currentMajor}.${config.currentMinor}.${config.currentPatch}`;
}

function createMigration(name: string, incrementType: 'major' | 'minor' | 'patch' = 'patch'): void {
  if (!name) {
    console.error('Nome da migration não fornecido!');
    console.log('');
    console.log('Uso:');
    console.log('  npm run migration:create -- --name=add_user_table');
    console.log('  npm run migration:create -- --name=add_user_table --major');
    console.log('  npm run migration:create -- --name=add_user_table --minor');
    process.exit(1);
  }

  // Sanitize name (remove caracteres especiais, converte para snake_case)
  const sanitizedName = name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  const version = getNextVersion(incrementType);
  const timestamp = new Date().toISOString().split('T')[0];
  const author = process.env.GIT_AUTHOR_NAME || process.env.USER || 'Unknown';

  // Mensagem sobre tipo de incremento
  const versionInfo = {
    major: 'BREAKING CHANGE - Major version',
    minor: 'NEW FEATURE - Minor version',
    patch: 'BUG FIX/IMPROVEMENT - Patch version',
  };

  console.log(`\n${versionInfo[incrementType]}`);

  const upFilename = `${version}__${sanitizedName}.sql`;
  const downFilename = `${version}__${sanitizedName}.down.sql`;

  const migrationsDir = path.join(__dirname, 'migrations');
  const upFilePath = path.join(migrationsDir, upFilename);
  const downFilePath = path.join(migrationsDir, downFilename);

  // Template UP
  const upTemplate = `-- Migration: ${sanitizedName.replace(/_/g, ' ')}
-- Version: ${version}
-- Author: ${author}
-- Date: ${timestamp}
-- Description: TODO - Descrever o que esta migration faz

-- =====================================================
-- ATENÇÃO: Use transações quando possível
-- =====================================================

BEGIN;

-- TODO: Escrever SQL aqui
-- Exemplo:
-- CREATE TABLE IF NOT EXISTS my_table (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     name VARCHAR(255) NOT NULL,
--     created_at TIMESTAMP DEFAULT NOW()
-- );

-- CREATE INDEX IF NOT EXISTS idx_my_table_name ON my_table(name);

COMMIT;

-- =====================================================
-- NOTAS:
-- - Sempre usar IF EXISTS / IF NOT EXISTS
-- - Testar localmente antes de commitar
-- - Documentar breaking changes
-- =====================================================
`;

  // Template DOWN
  const downTemplate = `-- Rollback: ${sanitizedName.replace(/_/g, ' ')}
-- Version: ${version}
-- Author: ${author}
-- Date: ${timestamp}
-- Description: Reverte as mudanças da migration ${version}

-- =====================================================
-- ATENÇÃO: Use transações quando possível
-- =====================================================

BEGIN;

-- TODO: Escrever SQL de rollback aqui
-- Exemplo:
-- DROP INDEX IF EXISTS idx_my_table_name;
-- DROP TABLE IF EXISTS my_table;

COMMIT;

-- =====================================================
-- NOTAS:
-- - Deve reverter TODAS as mudanças da migration UP
-- - Testar rollback antes de commitar
-- =====================================================
`;

  // Criar arquivos
  fs.writeFileSync(upFilePath, upTemplate);
  fs.writeFileSync(downFilePath, downTemplate);

  console.log('Migration criada com sucesso!\n');
  console.log(`Arquivos criados:`);
  console.log(`  UP:   ${upFilename}`);
  console.log(`  DOWN: ${downFilename}\n`);
  console.log(`Próximos passos:`);
  console.log(`  1. Edite os arquivos e escreva o SQL`);
  console.log(`  2. Teste localmente: npm run migrate`);
  console.log(`  3. Teste rollback: npm run migrate:undo`);
  console.log(`  4. Commit e push para disparar pipeline\n`);
  console.log(`Dica: Veja MIGRATION_GUIDE.md para boas práticas`);
}

// Parse arguments
const args = process.argv.slice(2);
const nameArg = args.find(arg => arg.startsWith('--name='));

if (!nameArg) {
  console.error('Argumento --name é obrigatório!\n');
  console.log('Uso:');
  console.log('  npm run migration:create -- --name=add_user_table');
  console.log('  npm run migration:create -- --name=add_user_table --major  # Breaking changes');
  console.log('  npm run migration:create -- --name=add_user_table --minor  # New features');
  console.log('  npm run migration:create -- --name=add_user_table          # Bug fixes (default)');
  process.exit(1);
}

const name = nameArg.replace('--name=', '');

// Determinar tipo de incremento
let incrementType: 'major' | 'minor' | 'patch' = 'patch';
if (args.includes('--major')) {
  incrementType = 'major';
} else if (args.includes('--minor')) {
  incrementType = 'minor';
}

createMigration(name, incrementType);

