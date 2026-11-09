import { migration001 } from './001_initial';

export interface Migration {
  version: number;
  sql: string;
}

// Append only. Versions must be consecutive.
export const migrations: Migration[] = [{ version: 1, sql: migration001 }];
