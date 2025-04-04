import chokidar from 'chokidar';
import path from 'path';
import shell from 'shelljs';

export async function runXPineDevServer() {

  shell.exec('npm run build');

  // Watch files
  const watcher = chokidar.watch(path.join(import.meta.dirname, '../'), {
    ignoreInitial: true,
  });
  watcher.on('all', async (event) => {
    shell.exec('npm run build');
  });
}

runXPineDevServer();