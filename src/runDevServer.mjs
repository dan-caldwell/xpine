import expressWs from 'express-ws';
import http from 'http';
import express from 'express';
import EventEmitter from 'events';
import chokidar from 'chokidar';
import { buildApp } from './build.mjs';
import { globSync } from 'glob';
import path from 'path';
import { config } from './util/get-config.mjs';
import require from './util/require.mjs';

export async function runDevServer() {
  const startServer = require(config.serverAppPath);

  // Initial server set up
  await buildApp(true);
  let appServer = await startServer.default();

  // Watch files
  const watcher = chokidar.watch(config.srcDir, {
    ignoreInitial: true,
    // Ignore map and prisma files
    ignored: (pathName) => pathName.endsWith('.map') || pathName.startsWith(path.join(config.serverDir, './prisma')),
  });
  watcher.on('all', async (event, path) => {
    const shouldReloadServer = (path.startsWith(config.serverDir) && !path.startsWith(config.runDir)) ||
      ['add', 'unlink'].includes(event) && path.startsWith(config.pagesDir);
    if (shouldReloadServer) {
      // We modified files in the server, restart the server
      appServer.server.close();
      await buildApp(true);
      // Clear requires for startServer, then restart the server
      delete require.cache[config.serverAppPath];
      const startServer = require(config.serverAppPath);
      appServer = await startServer.default();
      return;
    }
    // Clear all import cache for components
    const files = globSync(config.distDir + '/**/*.{tsx,ts,js,jsx}', {
      ignore: [config.serverDistDir + '/**/*.*'],
    });
    for (const file of files) {
      delete require.cache[file];
    }
    await buildApp(true);
    refreshEmitter.emit('refresh');
  });

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


