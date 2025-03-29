import chokidar from 'chokidar';
import path from 'path';
import { buildXPine } from './build-module';

export async function runXPineDevServer() {

  await buildXPine();

  // Watch files
  const watcher = chokidar.watch(path.join(import.meta.dirname, '../'), {
    ignoreInitial: true,
  });
  watcher.on('all', async (event) => {
    await buildXPine();
  });
}

runXPineDevServer();