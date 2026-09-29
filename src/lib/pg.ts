import pg from 'pg';

let pool: pg.Pool | null = null;

export function postgresAvailable(): boolean {
  return Boolean(process.env.POSTGRES_URL);
}

export function postgresPool(): pg.Pool {
  const url = process.env.POSTGRES_URL;
  if (!url) throw new Error('POSTGRES_URL is not set');
  pool ??= new pg.Pool({ connectionString: url, max: 1 });
  return pool;
}
