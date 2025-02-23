import dotenv from 'dotenv';
import path from 'path';
import { config } from './get-config';

export function setupEnv() {
  dotenv.config({ path: path.join(config.rootDir, `./.env.${process.env.STAGE || 'dev'}`),});
}
