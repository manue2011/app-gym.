import { migration001 } from './001_initial';
import { migration002 } from './002_template_exercises';

export interface Migration {
  version: number;
  sql: string;
}

// Append only. Versions must be consecutive.
export const migrations: Migration[] = [
  { version: 1, sql: migration001 },
  { version: 2, sql: migration002 },
];
