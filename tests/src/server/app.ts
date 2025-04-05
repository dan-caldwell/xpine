import express from 'express';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import http from 'http';
import { createXPineRouter, setupEnv } from 'xpine';

await setupEnv();

export default async function startServer() {
  const port = process.env.PORT || 8080;
  const app = express();
  app.set('view engine', 'html');

  app.enable('trust proxy');
  app.use(logger('dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true, }));
  app.use(cookieParser());

  await createXPineRouter(app);

  app.set('port', port);
  const server = http.createServer(app);
  server.listen(port, () => {
    console.info(`Server listening on port ${port}`);
  });
  return {
    app,
    server,
  };
}
