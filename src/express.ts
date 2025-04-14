import express, { NextFunction, Express, Request, Response } from 'express';
import { globSync } from 'glob';
import { config } from './util/get-config';
import { verifyUser } from './auth';
import requestIP from 'request-ip';
import { ConfigFile, ServerRequest } from '../types';
import fs from 'fs-extra';
import path from 'path';
import regex from './util/regex';
import { getCompleteConfig, getConfigFiles } from './util/config-file';
import { doctypeHTML } from './util/constants';
import EventEmitter from 'events';
import { context } from './context';
import { config as xpineConfig } from './util/get-config';

class OnInitEmitter extends EventEmitter { };
const onInitEmitter = new OnInitEmitter();

onInitEmitter.on('triggerOnInit', async (paths) => {
  for (const routePath of paths) {
    const pathImport = await import(routePath.path + `?cache=${Date.now()}`);
    if (pathImport?.config?.onInit) await pathImport.config.onInit();
  }
});

function getAllBuiltRoutes() {
  const routes = globSync(config.pagesDir + '/**/*.{tsx,ts}');
  return routes.map(route => {
    const routeFormatted = route.split(config.pagesDir).pop().replace('.tsx', '').replace('.js', '').replace('.ts', '');
    if (routeFormatted.endsWith('+config')) return;
    // Replace index
    const routeFormattedWithIndex = routeFormatted.replace(/\/index$/g, '');
    return {
      route: routeFormattedWithIndex,
      path: route.replace(config.srcDir, config.distDir).replace('.tsx', '.js').replace('.ts', '.js'),
      originalRoute: route,
    };
  }).filter(Boolean);
}

export async function createRouter() {
  const isDev = process.env.NODE_ENV === 'development';
  const methods = ['get', 'post', 'put', 'patch', 'delete'];
  const router = express.Router();
  const routeMap = getAllBuiltRoutes();
  const routeResults = [];
  const configFiles = globSync(config.pagesDir + '/**/+config.{tsx,ts}');

  // Onload
  const xpineOnLoad = (await import(path.join(xpineConfig.distDir, './__xpineOnLoad.js')))?.default;
  if (xpineOnLoad && !isDev) await xpineOnLoad();

  for (const route of routeMap) {
    const isJSX = route.originalRoute.endsWith('.tsx') || route.originalRoute.endsWith('.jsx');
    // Configure result,methods for the route
    const slugRoute = route.route.replace(/[ ]/g, '');
    const foundMethod = methods.find(method => slugRoute.endsWith(`.${method}`));
    const isDynamicRoute = slugRoute.match(regex.isDynamicRoute);
    let formattedRouteItem = slugRoute;
    if (foundMethod) formattedRouteItem = formattedRouteItem.split('.').shift();
    // Handle dynamic routing
    if (isDynamicRoute) {
      const result = [...formattedRouteItem.matchAll(regex.dynamicRoutes)];
      for (const match of result) {
        formattedRouteItem = formattedRouteItem.replace(match[0], ':' + match[2]);
      }
    }

    // Import route
    const componentImport = await import(route.path);
    const componentFn = isDev ? null : componentImport?.default;

    // Init
    if (componentImport?.config?.onInit) {
      await componentImport.config?.onInit();
    }

    // Config
    let config: ConfigFile = {};
    const configFilePaths = getConfigFiles(route.originalRoute, configFiles);
    if (!isDev) {
      config = configFilePaths && await getCompleteConfig(configFilePaths, Date.now());
      if (componentImport?.config) {
        config = {
          ...config,
          ...componentImport.config,
        };
      }
    }

    // Push to the route results array
    routeResults.push({
      formattedRouteItem,
      foundMethod,
      route,
    });
    router[foundMethod || 'get'](formattedRouteItem, async (req: Request, res: Response) => {
      try {
        const staticPath = routeHasStaticPath(formattedRouteItem, req.params);
        if (staticPath && !isDev) {
          res.sendFile(staticPath);
          return;
        }
        // Check if it's a string response from the componentFn or is a different response
        if (componentFn && !isDev) {
          if (isJSX) {
            const data = config?.data ? await config.data(req) : null;
            const originalResult = await componentFn({ req, res, data, });
            const output = config?.wrapper ? await config.wrapper({ req, children: originalResult, config, data, }) : originalResult;
            res.send(doctypeHTML + output);
          } else {
            await componentFn(req, res);
          }
          return;
        }

        const xpineOnLoad = (await import(path.join(xpineConfig.distDir, './__xpineOnLoad.js') + `?cache=${Date.now()}`))?.default;
        if (xpineOnLoad) await xpineOnLoad();

        const componentImportDev = await import(route.path + `?cache=${Date.now()}`);
        const componentFnDev = componentImportDev.default;

        // Trigger new onInit for all routes
        onInitEmitter.emit('triggerOnInit', getAllBuiltRoutes());

        // Require every time only if in development mode
        if (isJSX) {
          let config = configFilePaths && await getCompleteConfig(configFilePaths, Date.now());
          if (componentImportDev?.config) {
            config = {
              ...config,
              ...componentImportDev.config,
            };
          }
          const data = config?.data ? await config.data(req) : null;
          const originalResult = await componentFnDev({ req, res, data, config });
          const output = config?.wrapper ? await config.wrapper({ req, children: originalResult, config, data, }) : originalResult;
          context.clear();
          res.send(doctypeHTML + output);
        } else {
          await componentFnDev(req, res);
        }
      } catch (err) {
        console.error(err);
        res.status(err?.status || 500).send(err?.message || 'Error');
      }
    });
  }
  return {
    router,
    routeResults,
  };
}

async function verifyUserMiddleware(req: ServerRequest, _res: Response, next: NextFunction) {
  // @ts-ignore
  const { usertoken, } = req.cookies;
  if (!usertoken) {
    req.user = null;
  }
  try {
    const { user, } = await verifyUser(usertoken);
    req.user = user;
  } catch (err) {
    req.user = null;
  }
  next();
}

export async function createXPineRouter(app: any, beforeErrorRoute?: (app: Express) => void) {
  app.use(express.static(config.distPublicDir));
  app.use(verifyUserMiddleware);
  app.use(requestIP.mw());

  const { router, routeResults, } = await createRouter();
  app.use(function replaceableRouter(req: Request, res: Response, next: NextFunction) {
    router(req, res, next);
  });

  const found404 = routeResults?.find(item => item?.formattedRouteItem === '/404');
  const import404 = process.env.NODE_ENV === 'development' || !found404 ? null : (await import(found404.route.path)).default;

  if (beforeErrorRoute) beforeErrorRoute(app);

  // error handler
  app.use(async function (req: Request, res: Response) {
    // render the error page
    res.status(404);

    if (import404) {
      res.send(doctypeHTML + (await import404(req, res)));
    } else if (found404 && process.env.NODE_ENV === 'development') {
      const import404Item = (await import(found404.route.path + `?cache=${Date.now()}`)).default;
      res.send(doctypeHTML + (await import404Item(req, res)));
    } else {
      res.send('Error');
    }
  });
}

export function routeHasStaticPath(route: string, params: { [key: string]: string }): string | false {
  const paramEntries = Object.entries(params);
  let routeToStaticPath = route;
  for (const [key, value] of paramEntries) {
    routeToStaticPath = routeToStaticPath.replace(`:${key}`, value);
  }
  routeToStaticPath += '/index.html';
  // Check if path exists
  const outputPath = path.join(config.distPagesDir, routeToStaticPath);
  if (fs.existsSync(outputPath)) return outputPath;
  return false;
}
