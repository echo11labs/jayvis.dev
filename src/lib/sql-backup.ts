import { copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';

export function backupSqliteDatabase(): string | null {
  const url = process.env.DATABASE_URL ?? 'file:./dev.db';
  const relative = url.replace(/^file:/, '');
  const candidates = [
    path.resolve(process.cwd(), relative),
    path.resolve(process.cwd(), 'prisma', path.basename(relative)),
  ];
  const source = candidates.find((candidate) => existsSync(candidate));
  if (!source) return null;
  const destination = `${source}.${Date.now()}.bak`;
  copyFileSync(source, destination);
  return destination;
}
