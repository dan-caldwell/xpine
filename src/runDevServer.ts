import expressWs from 'express-ws';
import http from 'http';
import express from 'express';
import EventEmitter from 'events';
import chokidar from 'chokidar';
import { buildApp } from './scripts/build';
import path from 'path';
import { config } from './util/get-config';
import { setupEnv } from './util/env';

await setupEnv();

export async function runDevServer() {
  process.env.NODE_ENV = 'development';

  const rebuildEmitter = createRebuildEmitter();

  // Initial server set up
  await buildApp({ isDev: true, });

  const startServer = (await import(config.serverDistAppPath + `?cache=${Date.now()}`)).default;

  let appServer = await startServer();

  // Watch files
  const watcher = chokidar.watch(config.srcDir, {
    ignoreInitial: true,
    // Ignore map and prisma files
    ignored: (pathName) => pathName.endsWith('.map') || pathName.startsWith(path.join(config.serverDir, './prisma')),
  });
  watcher.on('all', async (event, path) => {
    const isRegularExpressRoute = path.startsWith(config.pagesDir) && (path.endsWith('.ts') || path.endsWith('.js'));
    const isServerDir = path.startsWith(config.serverDir) && !path.startsWith(config.runDir);
    const shouldReloadServer = isServerDir || isRegularExpressRoute ||
      ['add', 'unlink'].includes(event) && path.startsWith(config.pagesDir);
    if (shouldReloadServer) {
      // We modified files in the server, restart the server
      await asyncServerClose(appServer.server);
      rebuildEmitter.emit('rebuild-server');
      return;
    }
    await buildApp({ isDev: true, });
    refreshEmitter.emit('refresh');
  });

  rebuildEmitter.on('done', async () => {
    await rebuildServer();
  });

  async function rebuildServer() {
    await buildApp({ isDev: true, });
    const startServer = (await import(config.serverDistAppPath + `?cache=${Date.now()}`)).default;
    appServer = await startServer();
  }

  // Create web socket sever
  const wsApp = express();
  const wsServer = http.createServer(wsApp);
  expressWs(wsApp, wsServer);
  class RefreshEmitter extends EventEmitter { };
  const refreshEmitter = new RefreshEmitter();

  // @ts-ignore
  wsApp.ws('/dev-server', function (ws) {
    refreshEmitter.removeAllListeners();
    refreshEmitter.on('refresh', () => {
      ws.send('refresh:client');
    });
  });

  const wsPort = 3001;
  wsServer.listen(wsPort);
  wsServer.on('listening', () => {
    console.info(`Dev server listening on port ${wsPort}`);
  });
}

function asyncServerClose(server) {
  return new Promise((resolve, reject) => {
    server.close();
    resolve(true);
  });
}

function createRebuildEmitter(delay = 500) {
  class RebuildEmitter extends EventEmitter { };
  const rebuildEmitter = new RebuildEmitter();
  let start = 0;
  let hasEmitted = false;
  rebuildEmitter.on('rebuild-server', () => {
    hasEmitted = false;
    trigger();
  });
  function trigger() {
    start = Date.now();
    const interval = setInterval(() => {
      if (hasEmitted) return;
      const now = Date.now();
      if (now - start >= delay) {
        rebuildEmitter.emit('done');
        clearInterval(interval);
        hasEmitted = true;
      }
    }, 100);
  }
  return rebuildEmitter;
}
