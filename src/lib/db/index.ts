import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getDbInstance() {
  if (_db) return _db;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL 未配置');
  }

  const client = postgres(url, { max: 10, idle_timeout: 20, connect_timeout: 10 });
  _db = drizzle(client, { schema });
  return _db;
}

// 通过 Proxy 懒加载，类型安全
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const real = getDbInstance();
    const value = (real as any)[prop];
    // 如果是函数，绑定 this
    if (typeof value === 'function') {
      return value.bind(real);
    }
    return value;
  },
});

export * from './schema';
