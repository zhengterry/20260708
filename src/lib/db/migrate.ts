/**
 * 数据库迁移执行脚本
 * 运行方式: npx tsx src/lib/db/migrate.ts
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('请设置 DATABASE_URL 环境变量');
  process.exit(1);
}

async function runMigrations() {
  const migrationClient = postgres(connectionString!, { max: 1 });

  try {
    await migrate(drizzle(migrationClient), {
      migrationsFolder: './drizzle',
    });
    console.log('数据库迁移执行完成！');
  } catch (err) {
    console.error('迁移执行失败:', err);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

runMigrations();
