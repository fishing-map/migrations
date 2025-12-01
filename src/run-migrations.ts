import { Pool } from 'pg';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { config } from 'dotenv';

config();

interface Migration {
  id: number;
  name: string;
  executed_at: Date;
}

class MigrationRunner {
  private readonly pool: Pool;
  private readonly migrationsDir: string;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: Number.parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'fishing_map',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });

    this.migrationsDir = path.join(__dirname, 'migrations');
  }

  async ensureMigrationsTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await this.pool.query(query);
    console.log('✅ Tabela de migrations criada/verificada');
  }

  async getExecutedMigrations(): Promise<Migration[]> {
    const result = await this.pool.query<Migration>(
      'SELECT * FROM schema_migrations ORDER BY id ASC'
    );
    return result.rows;
  }

  async getPendingMigrations(): Promise<string[]> {
    const executedMigrations = await this.getExecutedMigrations();
    const executedNames = new Set(executedMigrations.map(m => m.name));

    const allMigrations = fs
      .readdirSync(this.migrationsDir)
      .filter((file: string) => file.endsWith('.sql'))
      .sort();

    return allMigrations.filter((name: string) => !executedNames.has(name));
  }

  async runMigration(filename: string): Promise<void> {
    const filePath = path.join(this.migrationsDir, filename);
    const sql = fs.readFileSync(filePath, 'utf-8');

    console.log(`🔄 Executando migration: ${filename}`);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Executar SQL da migration
      await client.query(sql);

      // Registrar migration como executada
      await client.query(
        'INSERT INTO schema_migrations (name) VALUES ($1)',
        [filename]
      );

      await client.query('COMMIT');
      console.log(`✅ Migration executada com sucesso: ${filename}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Erro ao executar migration ${filename}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async runPendingMigrations(): Promise<void> {
    console.log('🚀 Iniciando execução de migrations...\n');

    await this.ensureMigrationsTable();

    const pendingMigrations = await this.getPendingMigrations();

    if (pendingMigrations.length === 0) {
      console.log('✅ Nenhuma migration pendente. Banco de dados está atualizado!\n');
      return;
    }

    console.log(`📋 ${pendingMigrations.length} migration(s) pendente(s):\n`);
    for (const name of pendingMigrations) {
      console.log(`   - ${name}`);
    }
    console.log('');

    for (const migration of pendingMigrations) {
      await this.runMigration(migration);
    }

    console.log('\n✅ Todas as migrations foram executadas com sucesso!');
  }

  async undoLastMigration(): Promise<void> {
    console.log('🔄 Desfazendo última migration...\n');

    await this.ensureMigrationsTable();

    const executedMigrations = await this.getExecutedMigrations();

    if (executedMigrations.length === 0) {
      console.log('⚠️  Nenhuma migration executada para desfazer.');
      return;
    }

    const lastMigration = executedMigrations[executedMigrations.length - 1];
    await this.rollbackMigration(lastMigration);
  }

  async rollbackMigration(migration: Migration): Promise<void> {
    const filename = migration.name.replace('.sql', '.down.sql');
    const filePath = path.join(this.migrationsDir, filename);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ Arquivo de rollback não encontrado: ${filename}`);
      throw new Error(`Rollback file not found: ${filename}`);
    }

    const sql = fs.readFileSync(filePath, 'utf-8');

    console.log(`🔄 Desfazendo migration: ${migration.name}`);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Executar SQL de rollback
      await client.query(sql);

      // Remover registro da migration
      await client.query(
        'DELETE FROM schema_migrations WHERE id = $1',
        [migration.id]
      );

      await client.query('COMMIT');
      console.log(`✅ Migration desfeita com sucesso: ${migration.name}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Erro ao desfazer migration:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async rollbackToVersion(targetVersion: string): Promise<void> {
    console.log(`🔄 Rollback para versão: ${targetVersion}\n`);

    await this.ensureMigrationsTable();

    const executedMigrations = await this.getExecutedMigrations();

    if (executedMigrations.length === 0) {
      console.log('⚠️  Nenhuma migration executada.');
      return;
    }

    // Encontrar migrations para desfazer (em ordem reversa)
    const migrationsToRollback: Migration[] = [];
    let foundTarget = false;

    for (let i = executedMigrations.length - 1; i >= 0; i--) {
      const migration = executedMigrations[i];

      if (migration.name === targetVersion || migration.name.startsWith(targetVersion)) {
        foundTarget = true;
        break;
      }

      migrationsToRollback.push(migration);
    }

    if (!foundTarget) {
      console.error(`❌ Versão não encontrada: ${targetVersion}`);
      console.log('\n📋 Migrations disponíveis:');
      executedMigrations.forEach(m => console.log(`   - ${m.name}`));
      return;
    }

    if (migrationsToRollback.length === 0) {
      console.log('✅ Já está na versão especificada.');
      return;
    }

    console.log(`📋 ${migrationsToRollback.length} migration(s) para desfazer:\n`);
    for (const migration of migrationsToRollback) {
      console.log(`   - ${migration.name}`);
    }
    console.log('');

    // Desfazer em ordem reversa
    for (const migration of migrationsToRollback) {
      await this.rollbackMigration(migration);
    }

    console.log(`\n✅ Rollback completo! Agora na versão: ${targetVersion}`);
  }

  async rollbackSteps(steps: number): Promise<void> {
    console.log(`🔄 Desfazendo ${steps} migration(s)...\n`);

    await this.ensureMigrationsTable();

    const executedMigrations = await this.getExecutedMigrations();

    if (executedMigrations.length === 0) {
      console.log('⚠️  Nenhuma migration executada para desfazer.');
      return;
    }

    const migrationsToRollback = executedMigrations
      .slice(-steps)
      .reverse();

    if (migrationsToRollback.length < steps) {
      console.log(`⚠️  Solicitado desfazer ${steps} migrations, mas apenas ${migrationsToRollback.length} disponível(is).`);
    }

    console.log(`📋 ${migrationsToRollback.length} migration(s) para desfazer:\n`);
    for (const migration of migrationsToRollback) {
      console.log(`   - ${migration.name}`);
    }
    console.log('');

    for (const migration of migrationsToRollback) {
      await this.rollbackMigration(migration);
    }

    console.log(`\n✅ ${migrationsToRollback.length} migration(s) desfeita(s) com sucesso!`);
  }

  async showStatus(): Promise<void> {
    console.log('📊 Status das Migrations\n');
    console.log('═'.repeat(60));

    await this.ensureMigrationsTable();

    const executedMigrations = await this.getExecutedMigrations();
    const pendingMigrations = await this.getPendingMigrations();

    console.log('\n✅ Migrations Executadas:');
    if (executedMigrations.length === 0) {
      console.log('   (nenhuma)');
    } else {
      executedMigrations.forEach((m, index) => {
        const date = new Date(m.executed_at).toLocaleString('pt-BR');
        console.log(`   ${index + 1}. ${m.name} (${date})`);
      });
    }

    console.log('\n⏳ Migrations Pendentes:');
    if (pendingMigrations.length === 0) {
      console.log('   (nenhuma)');
    } else {
      pendingMigrations.forEach((m, index) => {
        console.log(`   ${index + 1}. ${m}`);
      });
    }

    console.log('\n' + '═'.repeat(60));
    console.log(`📈 Total: ${executedMigrations.length} executadas | ${pendingMigrations.length} pendentes`);

    if (executedMigrations.length > 0) {
      const lastMigration = executedMigrations[executedMigrations.length - 1];
      console.log(`🔖 Versão atual: ${lastMigration.name}`);
    }
    console.log('');
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Executar migrations
async function main() {
  const runner = new MigrationRunner();

  try {
    const args = process.argv.slice(2);

    // Comandos disponíveis
    if (args.includes('--undo') || args.includes('--rollback')) {
      // Rollback de última migration
      await runner.undoLastMigration();
    } else if (args.includes('--rollback-to')) {
      // Rollback para versão específica
      const versionIndex = args.findIndex(arg => arg === '--rollback-to');
      const version = args[versionIndex + 1];

      if (!version) {
        console.error('❌ Erro: Versão não especificada');
        console.log('Uso: npm run migrate -- --rollback-to V1.0.5__migration_name.sql');
        process.exit(1);
      }

      await runner.rollbackToVersion(version);
    } else if (args.includes('--rollback-steps')) {
      // Rollback N migrations
      const stepsIndex = args.findIndex(arg => arg === '--rollback-steps');
      const stepsStr = args[stepsIndex + 1];
      const steps = Number.parseInt(stepsStr, 10);

      if (!stepsStr || Number.isNaN(steps) || steps <= 0) {
        console.error('❌ Erro: Número de steps inválido');
        console.log('Uso: npm run migrate -- --rollback-steps 3');
        process.exit(1);
      }

      await runner.rollbackSteps(steps);
    } else if (args.includes('--status')) {
      // Mostrar status
      await runner.showStatus();
    } else if (args.includes('--help') || args.includes('-h')) {
      // Ajuda
      console.log('🗄️  Migrations Runner - Fishing Map\n');
      console.log('Comandos disponíveis:\n');
      console.log('  npm run migrate');
      console.log('    Executa todas migrations pendentes\n');
      console.log('  npm run migrate -- --undo');
      console.log('  npm run migrate -- --rollback');
      console.log('    Desfaz última migration\n');
      console.log('  npm run migrate -- --rollback-steps <N>');
      console.log('    Desfaz as últimas N migrations');
      console.log('    Exemplo: npm run migrate -- --rollback-steps 3\n');
      console.log('  npm run migrate -- --rollback-to <version>');
      console.log('    Desfaz migrations até a versão especificada');
      console.log('    Exemplo: npm run migrate -- --rollback-to V1.0.5\n');
      console.log('  npm run migrate -- --status');
      console.log('    Mostra status de migrations (executadas e pendentes)\n');
      console.log('  npm run migrate -- --help');
      console.log('    Mostra esta ajuda\n');
      process.exit(0);
    } else {
      // Comando padrão: executar migrations pendentes
      await runner.runPendingMigrations();
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  } finally {
    await runner.close();
  }
}

main();
