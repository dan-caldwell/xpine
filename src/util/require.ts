import { createRequire } from 'module';

export default createRequire(import.meta.url);

export function getXPineDistDir() {
  const dir = import.meta.dirname;
  const splitDir = dir.split('/xpine/dist');
  return splitDir[0] + '/xpine/dist';
}