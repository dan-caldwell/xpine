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
import { triggerXPineOnLoad } from './build/typescript-builder';

const methods = ['get', 'post', 'put', 'patch', 'delete'];
const isDev = process.env.NODE_ENV === 'development';

type RouteMap = {
  route: string;
  path: string;
  originalRoute: string;
}

class OnInitEmitter extends EventEmitter { };
const onInitEmitter = new OnInitEmitter();

onInitEmitter.on('triggerOnInit', async (paths) => {
  for (const routePath of paths) {
    const pathImport = await import(routePath.path + `?cache=${Date.now()}`);
    if (pathImport?.config?.onInit) await pathImport.config.onInit();
  }
});

function getAllBuiltRoutes(): RouteMap[] {
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

async function createRouteFunction(route: RouteMap, configFiles: string[]) {
  const isJSX = route.originalRoute.endsWith('.tsx') || route.originalRoute.endsWith('.jsx');
  // Configure result,methods for the route
  const slugRoute = route.route.replace(/[ ]/g, '');
  const foundMethod = methods.find(method => slugRoute.toUpperCase().endsWith(`.${method.toUpperCase()}`));
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
  // Handle catch all routes
  const hasCatchAll = formattedRouteItem.match(regex.catchAllRoute);
  if (hasCatchAll) formattedRouteItem = formattedRouteItem.replace(regex.catchAllRoute, '/*');

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
  config = configFilePaths && await getCompleteConfig(configFilePaths, Date.now());
  if (componentImport?.config) {
    config = {
      ...config,
      ...componentImport.config,
    };
  }

  async function routeFn(req: Request, res: Response) {
    const urlPath = req?.route?.path || '/';
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
          const originalResult = await componentFn({ req, res, data, routePath: urlPath, });
          const output = config?.wrapper ? await config.wrapper({ req, children: originalResult, config, data, routePath: urlPath, }) : originalResult;
          res.send(doctypeHTML + output);
        } else {
          await componentFn(req, res);
        }
        return;
      }

      await triggerXPineOnLoad(true);

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
        const originalResult = await componentFnDev({ req, res, data, config, routePath: urlPath, });
        const output = config?.wrapper ? await config.wrapper({ req, children: originalResult, config, data, routePath: urlPath, }) : originalResult;
        context.clear();
        res.send(doctypeHTML + output);
      } else {
        await componentFnDev(req, res);
      }
    } catch (err) {
      console.error(err);
      res.status(err?.status || 500).send(err?.message || 'Error');
    }
  }

  return {
    formattedRouteItem,
    foundMethod,
    route,
    config,
    routeFn,
  };
}

export async function createRouter() {
  const router = express.Router();
  const routeMap = getAllBuiltRoutes();
  const routeResults = [];
  const configFiles = globSync(config.pagesDir + '/**/+config.{tsx,ts}');

  // Onload
  await triggerXPineOnLoad();

  for (const route of routeMap) {
    try {
      const { formattedRouteItem, foundMethod, config, routeFn, } = await createRouteFunction(route, configFiles);

      if (config?.routeMiddleware) {
        router[foundMethod || 'get'](formattedRouteItem, config.routeMiddleware, routeFn);
      } else {
        router[foundMethod || 'get'](formattedRouteItem, routeFn);
      }

      // Push to the route results array
      routeResults.push({
        formattedRouteItem,
        foundMethod,
        route,
        routeFn,
      });
    } catch (err) {
      console.error(err);
    }
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

async function verifyAuthenticatedBundleMiddleware(req: ServerRequest, res: Response, next: NextFunction) {
  if (!req?.originalUrl?.startsWith('/scripts/')) {
    next();
    return;
  }
  const bundle = req?.originalUrl?.split('/')?.pop()?.split('.js')?.shift();
  // Check if bundle is valid
  const foundBundle = config?.bundles?.find(bundleItem => bundleItem?.id === bundle);
  if (!foundBundle) {
    next();
    return;
  }
  if (foundBundle?.requireAuthentication && !req?.user) {
    res.status(403).json({
      message: 'Unauthenticated',
    });
    return
  }
  next();
}

export async function createXPineRouter(app: any, beforeErrorRoute?: (app: Express) => void) {
  app.use(verifyUserMiddleware);
  app.use(verifyAuthenticatedBundleMiddleware);
  app.use(express.static(config.distPublicDir));
  app.use(requestIP.mw());

  const { router, routeResults, } = await createRouter();

  app.use(function replaceableRouter(req: Request, res: Response, next: NextFunction) {
    router(req, res, next);
  });

  const found404 = routeResults?.find(item => item?.formattedRouteItem === '/404');

  if (beforeErrorRoute) beforeErrorRoute(app);

  // error handler
  app.use(async function (req: Request, res: Response) {
    // render the error page
    res.status(404);
    if (found404?.routeFn) {
      found404?.routeFn(req, res);
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
    // Handle catch all routes
    if (key === '0') routeToStaticPath = routeToStaticPath.replace(/\/\*/g, `/${value}`);
  }
  routeToStaticPath += '/index.html';
  // Check if path exists
  const outputPath = path.join(config.distPagesDir, routeToStaticPath);
  if (fs.existsSync(outputPath)) return outputPath;
  return false;
}

export function filePathToURLPath(pathName: string, isDist: boolean = true) {
  const result = pathName.split(isDist ? config.distPagesDir : config.pagesDir).pop().replace(regex.indexFile, '').replace(regex.endsWithFileName, '');
  if (result.endsWith('/')) {
    const cleanedResult = result.slice(0, -1);
    if (!cleanedResult) return '/';
    return cleanedResult;
  }
  return result;
}
