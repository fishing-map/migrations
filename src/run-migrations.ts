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
  private readonly appSchema: string;

  constructor() {
    this.appSchema = process.env.DB_SCHEMA || 'fishing_map';

    // SSL configuration for managed PostgreSQL (DigitalOcean, AWS RDS, etc.)
    const sslMode = process.env.DB_SSL || 'disable';
    const sslConfig = (sslMode === 'require' || sslMode === 'true')
      ? { rejectUnauthorized: false }
      : false;

    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: Number.parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'defaultdb',
      ssl: sslConfig,
    };

    console.log('=== Configuração ===');
    console.log(`Host: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`Database: ${dbConfig.database}`);
    console.log(`Schema: ${this.appSchema}`);
    console.log(`User: ${dbConfig.user}`);
    console.log(`SSL: ${dbConfig.ssl ? 'habilitado' : 'desabilitado'}\n`);

    this.pool = new Pool(dbConfig);

    this.migrationsDir = process.env.NODE_ENV === 'production'
      ? '/app/src/migrations'
      : path.join(__dirname, 'migrations');

    console.log(`Migrations: ${this.migrationsDir}\n`);
  }

  async validateConnection(): Promise<void> {
    try {
      const result = await this.pool.query('SELECT current_database(), current_user, version()');
      const { current_database, current_user, version } = result.rows[0];

      console.log('=== Conexão Validada ===');
      console.log(`Database: ${current_database}`);
      console.log(`User: ${current_user}`);
      console.log(`PostgreSQL: ${version.split(',')[0]}`);

      // Configurar search_path para incluir o schema da aplicação
      await this.pool.query(`SET search_path TO ${this.appSchema}, public`);
      console.log(`Search path: ${this.appSchema}, public\n`);

    } catch (error) {
      console.error('❌ Erro ao conectar:', error);
      throw error;
    }
  }

  async ensureMigrationsTable(): Promise<void> {
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS public.schema_migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const result = await this.pool.query('SELECT COUNT(*) as count FROM public.schema_migrations');
      console.log(`=== Migrations ===`);
      console.log(`Executadas: ${result.rows[0].count}\n`);

    } catch (error) {
      console.error('Erro ao criar tabela:', error);
      throw error;
    }
  }

  async getExecutedMigrations(): Promise<Migration[]> {
    const result = await this.pool.query<Migration>(
      'SELECT * FROM public.schema_migrations ORDER BY id ASC'
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

    console.log(`🔄 Executando: ${filename}`);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET search_path TO ${this.appSchema}, public`);
      await client.query(sql);
      await client.query(
        'INSERT INTO public.schema_migrations (name) VALUES ($1)',
        [filename]
      );
      await client.query('COMMIT');
      console.log(`✅ Concluída: ${filename}\n`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Erro em ${filename}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async runPendingMigrations(): Promise<void> {
    console.log('🚀 Iniciando migrations...\n');

    await this.validateConnection();
    await this.ensureMigrationsTable();

    const pendingMigrations = await this.getPendingMigrations();

    if (pendingMigrations.length === 0) {
      console.log('✅ Banco atualizado! Nenhuma migration pendente.\n');
      return;
    }

    console.log(`📋 ${pendingMigrations.length} migration(s) pendente(s):\n`);
    pendingMigrations.forEach(name => console.log(`   • ${name}`));
    console.log('');

    for (const migration of pendingMigrations) {
      await this.runMigration(migration);
    }

    console.log('🎉 Todas as migrations concluídas!\n');
  }

  async undoLastMigration(): Promise<void> {
    console.log('⏪ Desfazendo última migration...\n');

    await this.validateConnection();
    await this.ensureMigrationsTable();

    const executedMigrations = await this.getExecutedMigrations();

    if (executedMigrations.length === 0) {
      console.log('⚠️  Nenhuma migration para desfazer.\n');
      return;
    }

    const lastMigration = executedMigrations.at(-1)!;
    await this.rollbackMigration(lastMigration);
  }

  async rollbackMigration(migration: Migration): Promise<void> {
    const filename = migration.name.replace('.sql', '.down.sql');
    const filePath = path.join(this.migrationsDir, filename);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ Rollback não encontrado: ${filename}`);
      throw new Error(`Rollback file not found: ${filename}`);
    }

    const sql = fs.readFileSync(filePath, 'utf-8');

    console.log(`🔄 Desfazendo: ${migration.name}`);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET search_path TO ${this.appSchema}, public`);
      await client.query(sql);
      await client.query(
        'DELETE FROM public.schema_migrations WHERE id = $1',
        [migration.id]
      );
      await client.query('COMMIT');
      console.log(`✅ Rollback concluído: ${migration.name}\n`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Erro no rollback:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async rollbackToVersion(targetVersion: string): Promise<void> {
    console.log(`⏪ Rollback para: ${targetVersion}\n`);

    await this.validateConnection();
    await this.ensureMigrationsTable();

    const executedMigrations = await this.getExecutedMigrations();

    if (executedMigrations.length === 0) {
      console.log('⚠️  Nenhuma migration executada.\n');
      return;
    }

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
      executedMigrations.forEach(m => console.log(`   • ${m.name}`));
      return;
    }

    if (migrationsToRollback.length === 0) {
      console.log('✅ Já está na versão especificada.\n');
      return;
    }

    console.log(`📋 ${migrationsToRollback.length} migration(s) para desfazer:\n`);
    migrationsToRollback.forEach(m => console.log(`   • ${m.name}`));
    console.log('');

    for (const migration of migrationsToRollback) {
      await this.rollbackMigration(migration);
    }

    console.log('🎉 Rollback concluído!\n');
  }

  async rollbackSteps(steps: number): Promise<void> {
    console.log(`⏪ Desfazendo ${steps} migration(s)...\n`);

    await this.validateConnection();
    await this.ensureMigrationsTable();

    const executedMigrations = await this.getExecutedMigrations();

    if (executedMigrations.length === 0) {
      console.log('⚠️  Nenhuma migration executada.\n');
      return;
    }

    const migrationsToRollback = executedMigrations
      .reverse()
      .slice(0, steps);

    console.log(`📋 Desfazendo ${migrationsToRollback.length} migration(s):\n`);
    migrationsToRollback.forEach(m => console.log(`   • ${m.name}`));
    console.log('');

    for (const migration of migrationsToRollback) {
      await this.rollbackMigration(migration);
    }

    console.log('🎉 Rollback concluído!\n');
  }

  async showStatus(): Promise<void> {
    await this.validateConnection();
    await this.ensureMigrationsTable();

    const executedMigrations = await this.getExecutedMigrations();
    const pendingMigrations = await this.getPendingMigrations();

    console.log('=== Status das Migrations ===\n');

    if (executedMigrations.length > 0) {
      console.log(`✅ Executadas (${executedMigrations.length}):`);
      executedMigrations.forEach((m, index) => {
        const date = new Date(m.executed_at).toLocaleString('pt-BR');
        console.log(`   ${index + 1}. ${m.name} (${date})`);
      });
      console.log('');
    }

    if (pendingMigrations.length > 0) {
      console.log(`⏳ Pendentes (${pendingMigrations.length}):`);
      pendingMigrations.forEach((m, index) => {
        console.log(`   ${index + 1}. ${m}`);
      });
      console.log('');
    }

    if (pendingMigrations.length === 0 && executedMigrations.length > 0) {
      const lastMigration = executedMigrations.at(-1)!;
      console.log('✅ Banco atualizado!');
      console.log(`Última migration: ${lastMigration.name}\n`);
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

async function main() {
  const runner = new MigrationRunner();
  const args = process.argv.slice(2);

  try {
    if (args.includes('--status')) {
      await runner.showStatus();
    } else if (args.includes('--undo')) {
      await runner.undoLastMigration();
    } else if (args.includes('--rollback')) {
      await runner.undoLastMigration();
    } else if (args.includes('--rollback-to')) {
      const versionIndex = args.indexOf('--rollback-to');
      const targetVersion = args[versionIndex + 1];
      if (!targetVersion) {
        console.error('Erro: Especifique a versão de destino');
        console.log('Uso: npm run migrate:rollback-to <versão>');
        process.exit(1);
      }
      await runner.rollbackToVersion(targetVersion);
    } else if (args.includes('--rollback-steps')) {
      const stepsIndex = args.indexOf('--rollback-steps');
      const steps = Number.parseInt(args[stepsIndex + 1], 10);
      if (Number.isNaN(steps) || steps <= 0) {
        console.error('Erro: Especifique um número válido de steps');
        console.log('Uso: npm run migrate:rollback-steps <número>');
        process.exit(1);
      }
      await runner.rollbackSteps(steps);
    } else {
      await runner.runPendingMigrations();
    }
  } catch (error) {
    console.error('\nErro fatal:', error);
    process.exit(1);
  } finally {
    await runner.close();
  }
}

main();

