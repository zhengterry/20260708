import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// 懒加载单例：Vercel 构建时不连接数据库，运行时按需创建
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    // 构建阶段：返回一个"无操作"代理，不会真连数据库
    const noop = new Proxy({}, {
      get: (_, prop) => {
        if (prop === 'then') return undefined;
        return (..._args: unknown[]) => noop;
      },
    });
    return noop as unknown as ReturnType<typeof drizzle<typeof schema>>;
  }
  const client = postgres(url, { max: 10, idle_timeout: 20, connect_timeout: 10 });
  return drizzle(client, { schema });
}

// 通过 Proxy 实现完全懒加载：第一次访问任何属性时才初始化
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    if (!_db) _db = createDb();
    return (_db as Record<string | symbol, unknown>)[prop];
  },
});

export * from './schema';
