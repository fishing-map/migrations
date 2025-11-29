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
    const filename = lastMigration.name.replace('.sql', '.down.sql');
    const filePath = path.join(this.migrationsDir, filename);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ Arquivo de rollback não encontrado: ${filename}`);
      return;
    }

    const sql = fs.readFileSync(filePath, 'utf-8');

    console.log(`🔄 Desfazendo migration: ${lastMigration.name}`);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Executar SQL de rollback
      await client.query(sql);

      // Remover registro da migration
      await client.query(
        'DELETE FROM schema_migrations WHERE id = $1',
        [lastMigration.id]
      );

      await client.query('COMMIT');
      console.log(`✅ Migration desfeita com sucesso: ${lastMigration.name}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Erro ao desfazer migration:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Executar migrations
async function main() {
  const runner = new MigrationRunner();

  try {
    const isUndo = process.argv.includes('--undo');

    if (isUndo) {
      await runner.undoLastMigration();
    } else {
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
