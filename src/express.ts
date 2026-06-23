import express, { NextFunction, Express, Request, RequestHandler, Response, Router } from 'express';
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
import { createCsrfMiddleware } from './csrf';

const methods = ['get', 'post', 'put', 'patch', 'delete'];
const isDev = process.env.NODE_ENV === 'development';

type RouteMap = {
  route: string;
  path: string;
  originalRoute: string;
}

// A parsed file-based route turned into an Express-ready path.
type ParsedRoute = {
  foundMethod: string | undefined;
  // The Express route path, e.g. /blog/:slug or /api/*
  formattedRouteItem: string;
  // The raw bracketed template, e.g. /blog/[...slug]
  templateRoute: string;
  // Whether the route uses a multi-segment ([...slug]) param
  isSpread: boolean;
}

// Everything needed to register a multi-segment ([...slug]) route.
type SpreadRoute = {
  templateRoute: string;
  // Known slugs from staticPaths(), each registered as an explicit route
  entries: { [key: string]: string }[];
  // Optional request-time validator for slugs not known at build time
  validator: ((slug: string, req: Request) => boolean | Promise<boolean>) | null;
}

// A component invoked to render a JSX page into an HTML string.
type RouteComponent = (props: {
  req: Request;
  res: Response;
  data: unknown;
  config: ConfigFile;
  routePath: string;
}) => string | Promise<string>;

// Registers a path (plus any route-specific middleware) against the router.
type RouteRegister = (routePath: string, preHandlers?: RequestHandler[]) => void;

// ---------------------------------------------------------------------------
// Route path parsing
// ---------------------------------------------------------------------------

// Turn a file-based route (e.g. /blog/[...slug] or /api/upload.POST) into an
// Express route path, pulling out the HTTP method and noting spread routes.
function parseRoutePath(route: string): ParsedRoute {
  const slugRoute = route.replace(/[ ]/g, '');
  const foundMethod = methods.find(method => slugRoute.toUpperCase().endsWith(`.${method.toUpperCase()}`));
  // Strip the .METHOD suffix; keep the bracketed template for spread expansion.
  const templateRoute = foundMethod ? (slugRoute.split('.').shift() ?? slugRoute) : slugRoute;

  // Multi-segment dynamic tokens first: [...slug] -> :slug
  let formattedRouteItem = templateRoute.replace(regex.spreadRoute, (_match, name) => ':' + name);
  // Single-segment dynamic tokens: [param] -> :param
  if (slugRoute.match(regex.isDynamicRoute)) {
    for (const match of formattedRouteItem.matchAll(regex.dynamicRoutes)) {
      formattedRouteItem = formattedRouteItem.replace(match[0], ':' + match[2]);
    }
  }
  // Catch all routes: /_all_ -> /*
  if (formattedRouteItem.match(regex.catchAllRoute)) {
    formattedRouteItem = formattedRouteItem.replace(regex.catchAllRoute, '/*');
  }

  return {
    foundMethod,
    formattedRouteItem,
    templateRoute,
    isSpread: regex.isSpreadRoute.test(templateRoute),
  };
}

// Replace every bracketed token ([...name] or [name]) with the matching value
// from a staticPaths() entry to produce a concrete, slash-containing path.
export function spreadConcretePath(templateRoute: string, entry: { [key: string]: string }): string {
  return templateRoute
    .replace(regex.spreadRoute, (_match, name) => entry[name] ?? '')
    .replace(regex.dynamicRoutes, (_match, _open, name) => entry[name] ?? '')
    .replace(/\/{2,}/g, '/');
}

// Build the wildcard path used by the runtime validator: [...slug] -> *, [param] -> :param
export function spreadWildcardPath(templateRoute: string): string {
  return templateRoute
    .replace(regex.spreadRoute, '*')
    .replace(regex.dynamicRoutes, (_match, _open, name) => ':' + name);
}

// The first multi-segment param name in a template, e.g. "slug" for /blog/[...slug]
export function spreadSlugName(templateRoute: string): string | null {
  const match = templateRoute.match(/\[\.\.\.(.*?)\]/);
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// Config + rendering
// ---------------------------------------------------------------------------

// Merge config from the matching +config files with any config exported by the
// component itself (the component's own config wins).
async function resolveConfig(configFilePaths: string[] | null, componentImport: { config?: ConfigFile }): Promise<ConfigFile> {
  const baseConfig = configFilePaths ? await getCompleteConfig(configFilePaths, Date.now()) : {};
  return componentImport?.config ? { ...baseConfig, ...componentImport.config, } : baseConfig;
}

// Render a JSX page (data -> component -> optional wrapper) into an HTML string.
async function renderJSX(componentFn: RouteComponent, config: ConfigFile, req: Request, res: Response, urlPath: string): Promise<string> {
  const data = config?.data ? await config.data(req) : null;
  const children = await componentFn({ req, res, data, config, routePath: urlPath, });
  const output = config?.wrapper
    ? await config.wrapper({ req, children, config, data, routePath: urlPath, })
    : children;
  return doctypeHTML + output;
}

// ---------------------------------------------------------------------------
// Spread ([...slug]) routes
// ---------------------------------------------------------------------------

// Gather the known slugs (from staticPaths()) and the optional validator that a
// multi-segment route needs in order to register explicit, safe routes.
async function resolveSpreadRoute(templateRoute: string, config: ConfigFile, originalRoute: string): Promise<SpreadRoute> {
  let entries: { [key: string]: string }[] = [];
  if (typeof config?.staticPaths === 'function') {
    try {
      entries = (await config.staticPaths()) || [];
    } catch (err) {
      console.error(err);
      console.error('Could not resolve staticPaths for spread route', originalRoute);
    }
  }
  return {
    templateRoute,
    entries,
    validator: config?.isValid || null,
  };
}

// Register a [...slug] route: one explicit route per known slug, plus an
// optional validator-gated wildcard for slugs not known at build time.
function registerSpreadRoutes(register: RouteRegister, spread: SpreadRoute) {
  const slugName = spreadSlugName(spread.templateRoute);

  // One explicit route per known slug — only these exact paths match, so
  // unknown paths safely fall through to the 404 handler.
  for (const entry of spread.entries) {
    register(spreadConcretePath(spread.templateRoute, entry), [
      (req, _res, next) => {
        Object.assign(req.params, entry);
        next();
      }
    ]);
  }

  // Optionally resolve slugs not known at build time, gated by config.isValid.
  const { validator, } = spread;
  if (validator) {
    register(spreadWildcardPath(spread.templateRoute), [
      async (req, _res, next) => {
        const slug = req.params[0];
        if (slugName) req.params[slugName] = slug;
        try {
          if (await validator(slug, req)) {
            next();
            return;
          }
        } catch (err) {
          console.error(err);
        }
        // Not a valid slug — fall through to the next route / 404 handler.
        next('route');
      }
    ]);
  }
}

// ---------------------------------------------------------------------------
// Router construction
// ---------------------------------------------------------------------------

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
  const { foundMethod, formattedRouteItem, templateRoute, isSpread, } = parseRoutePath(route.route);

  const componentImport = await import(route.path);
  const componentFn = isDev ? null : componentImport?.default;
  if (componentImport?.config?.onInit) await componentImport.config.onInit();

  const configFilePaths = getConfigFiles(route.originalRoute, configFiles);
  const config = await resolveConfig(configFilePaths, componentImport);

  async function routeFn(req: Request, res: Response) {
    const urlPath = req?.route?.path || '/';
    try {
      const staticPath = routeHasStaticPath(formattedRouteItem, req.params);
      if (staticPath && !isDev) {
        res.sendFile(staticPath);
        return;
      }

      // Production: serve the precompiled component and config.
      if (componentFn && !isDev) {
        if (isJSX) res.send(await renderJSX(componentFn, config, req, res, urlPath));
        else await componentFn(req, res);
        return;
      }

      // Development: re-import the component and re-resolve config on every
      // request so edits are picked up without restarting the server.
      await triggerXPineOnLoad(true);
      const devImport = await import(route.path + `?cache=${Date.now()}`);
      onInitEmitter.emit('triggerOnInit', getAllBuiltRoutes());

      if (isJSX) {
        const devConfig = await resolveConfig(configFilePaths, devImport);
        const html = await renderJSX(devImport.default, devConfig, req, res, urlPath);
        context.clear();
        res.send(html);
      } else {
        await devImport.default(req, res);
      }
    } catch (err) {
      console.error(err);
      const status = err?.status || 500;
      // Surface intentionally-thrown HTTP errors (those carrying a status) and
      // full detail in dev, but never leak internal error text for unexpected
      // failures in production.
      const message = (isDev || err?.status) ? (err?.message || 'Error') : 'Internal Server Error';
      res.status(status).send(message);
    }
  }

  const spread = isSpread ? await resolveSpreadRoute(templateRoute, config, route.originalRoute) : null;

  return { formattedRouteItem, foundMethod, route, config, routeFn, spread, };
}

// Build a helper that registers a path with its pre-handlers, the route's own
// middleware (if any), and finally the route handler.
function buildRouteRegister(router: Router, method: string, config: ConfigFile, routeFn: RequestHandler): RouteRegister {
  return (routePath, preHandlers = []) => {
    const handlers: RequestHandler[] = [...preHandlers];
    if (config?.routeMiddleware) handlers.push(config.routeMiddleware);
    handlers.push(routeFn);
    router[method](routePath, ...handlers);
  };
}

export async function createRouter() {
  const router = express.Router();
  const routeMap = getAllBuiltRoutes();
  const routeResults = [];
  const configFiles = globSync(config.pagesDir + '/**/+config.{tsx,ts}');

  await triggerXPineOnLoad();

  for (const route of routeMap) {
    try {
      const { formattedRouteItem, foundMethod, config: routeConfig, routeFn, spread, } = await createRouteFunction(route, configFiles);
      const register = buildRouteRegister(router, foundMethod || 'get', routeConfig, routeFn);

      if (spread) registerSpreadRoutes(register, spread);
      else register(formattedRouteItem);

      routeResults.push({ formattedRouteItem, foundMethod, route, routeFn, });
    } catch (err) {
      console.error(err);
    }
  }

  return { router, routeResults, };
}

async function verifyUserMiddleware(req: ServerRequest, _res: Response, next: NextFunction) {
  // @ts-ignore - req.cookies is populated by cookie-parser in the host app
  const usertoken = req.cookies?.usertoken;
  if (!usertoken) {
    req.user = null;
    next();
    return;
  }
  try {
    const { user, } = await verifyUser(usertoken);
    req.user = user;
  } catch {
    req.user = null;
  }
  next();
}

async function verifyAuthenticatedBundleMiddleware(req: ServerRequest, res: Response, next: NextFunction) {
  // Decode the path the same way express.static (send) does, so an encoded
  // character (e.g. /scripts/secret%2Ejs) can't skip this auth check while
  // still resolving to secret.js on disk.
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(req?.path || '');
  } catch {
    next();
    return;
  }
  if (!decodedPath.startsWith('/scripts/')) {
    next();
    return;
  }
  const fileName = decodedPath.split('/').pop() || '';
  if (!fileName.endsWith('.js')) {
    next();
    return;
  }
  const bundle = fileName.slice(0, -'.js'.length);
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
    return;
  }
  next();
}

export async function createXPineRouter(app: any, beforeErrorRoute?: (app: Express) => void) {
  app.use(verifyUserMiddleware);
  app.use(verifyAuthenticatedBundleMiddleware);
  app.use(express.static(config.distPublicDir));
  app.use(requestIP.mw());

  // Opt-in CSRF protection (config.csrf). Mounted after static assets (which are
  // safe GETs) so only page/API routes are guarded.
  if (config?.csrf) {
    app.use(createCsrfMiddleware(typeof config.csrf === 'object' ? config.csrf : undefined));
  }

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
  // Resolve the requested file and confine it to distPagesDir. Params come from
  // the URL (and may contain "../" or encoded "%2e%2e%2f"), so without this check
  // a catch-all/[...slug] route could be used to traverse out and read arbitrary
  // index.html files on disk.
  const pagesDir = path.resolve(config.distPagesDir);
  const outputPath = path.resolve(pagesDir, '.' + path.posix.normalize('/' + routeToStaticPath));
  if (outputPath !== pagesDir && !outputPath.startsWith(pagesDir + path.sep)) return false;
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
