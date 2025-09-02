# XPine - Alpine.js + JSX + Tailwind framework

Combines JSX with Alpine.js for a simpler, easier development experience. Includes a static site generator.

### Install

`npm install xpine`

### Routing, page setup, and using Alpine.js

XPine uses page based routing. Render an HTML page using JSX components, for example the path `/src/page/about.tsx` will route to `/about` and `/src/page/index.tsx` will route to `/`

```
import { WrapperProps } from 'xpine/dist/types';
import Base from '../components/Base';

export const config = {
  data() {
    return {
      title: 'Home page',
      description: 'The description',
    }
  },
  wrapper({ req, children, data, routePath }: WrapperProps) {
    return (
      <Base
        title={data?.title || 'My awesome website'}
        description={data?.description}
        req={req}
      >
        <h1>Home page wrapper</h1>
        {children}
      </Base>
    )
  },
}

export default function Home() {
  return (
    <div x-data="HomePageData" x-on:click="logMessage">
      Hello world
    </div>
  );
}

<script />

export function HomePageData() {
  return {
    logMessage() {
      console.log('Hello world');
    }
  };
}
```

- src/components/Base.tsx

```
import { JsxElement } from 'typescript';
import { ServerRequest } from 'xpine/dist/types';

type BaseProps = {
  head?: JsxElement;
  title: string;
  description?: string;
  req?: ServerRequest;
  children?: JsxElement;
}

export default async function Base({
  head,
  title,
  description,
  children,
}: BaseProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="robots" content="index,follow" />
        <meta name="description" content={description || `${title} page`} />
        <title>{title || 'My Website'}</title>
        <link rel="stylesheet" href="/styles/global.css" />
        <script defer src="/scripts/app.js"></script>
        {head}
      </head>
      <body>
        <div id="xpine-root">
          {children}
        </div>
      </body>
    </html>
  );
}
```

### Client side Javascript and CSS files

In the above code, we have a `/styles/global.css` file and a `/scripts/app.js` file import.

#### CSS

Create a file called `/src/public/styles/global.css` and import Tailwind:

```
@import "tailwindcss";
```

Note you must install tailwindcss yourself: `npm install tailwindcss`

#### Javascript

Create a file called `/src/public/scripts/index.ts`:

```
import Alpine from 'alpinejs';

Alpine.start();
```

Note you must install alpinejs yourself: `npm install alpinejs`

### Dynamic routing

Create dynamic routes with paths similar to this `/src/pages/[pathA]/[pathB]`

### Express API endpoints

Create regular Express routes by using .ts file extensions in the `/src/pages` folder. Specify the HTTP method by naming the file something like `/src/pages/api/my-endpoint.POST.ts`
```
import { PageProps } from 'xpine/dist/types';

export default async function myEndpoint({ res }: PageProps) {
  res.status(200).json({
    message: 'Hello World!',
  });
}
```

### Catch all routes
You can create catch all routes by naming the file \_all\_.(jsx|tsx|js|ts). You can make static catch all route pages by using the param `0` in the staticPaths config function:
```
  export const config = {
    staticPaths() {
      return [
        {
          0: 'hello/world',
        }
      ]
    },
  }
```

You can get the route param in your function with req.params[0], such as how express handles catch all routes.

### Route specific middleware

If you need route specific middleware, e.g. for file uploads, you can specify a `routeMiddleware` function in a config variable in the endpoint file:

```
export const config = {
  routeMiddleware(req, res, next) {
    console.log('route middleware');
    next();
  }
}
```

### Static Site Generation

Generate path specific static pages by specifying in the config of either the page's file, such as `/src/pages/about.tsx` with a config export:
```
export const config = {
  staticPaths: true,
  data() {
    return {
      title: 'My title'
    }
  }
}
```

or a `+config.ts` file.

### Configs

Configs can be nested. Create a +config.ts file in a directory and all subfolders will inherit that config unless overridden by their own +config.ts files. Want to apply static paths to an entire folder except for a single folder? In that folder you can create a `+config.ts` file like this:
```
export default {
  staticPaths: false,
}
```

### Dynamic Static Pages

You can also create dynamic static pages by using a function in the staticPaths folder. For example, a directory named `/src/[pathA]/[pathB]/[pathC]/[pathD].tsx` might have a configuration file like this:
```
import { ServerRequest } from 'xpine/dist/types';
import axios from 'axios';

export const config = {
  staticPaths() {
    return [
      {
        pathA: 'my-path-a2',
        pathB: 'my-path-b2',
        pathC: 'my-path-c2',
        pathD: '2'
      }
    ]
  },
  async data(req: ServerRequest) {
    const url = `https://jsonplaceholder.typicode.com/posts/${req.params.pathD}`;
    try {
      const { data } = await axios.get(url);
      return {
        ...data,
        ...req.params,
      };
    } catch (err) {
      console.error('could not fetch', url);
      return {
        ...req.params,
        data: {},
      }
    }
  }
}
```

### Context

Create app context, useful for things like Navbars. In `/src/context.tsx`:
```
import { createContext } from 'xpine';

export function NavbarContext() {
  const navbar = createContext([]);
  return {
    navbar,
  }
}
```

then in a page, say `/src/pages/about.tsx`, you can add to the NavbarContext like this:
```
export function xpineOnLoad() {
  context.addToArray('navbar', 'My awesome context 1', 2);
  context.addToArray('navbar', 'My awesome context 2', new Date('January 11, 2024'));
  context.addToArray('navbar', 'My awesome context 3', new Date('January 10, 2024'));
  context.addToArray('navbar', 'My awesome context 4', new Date('January 30, 2024'));
}
```

Context is sorted by array position then by date. You can then use context in your component like this:
```
import { context } from 'xpine';

export default function Navbar() {
  const navbar = context.get('navbar');
  return (
    <div>
      {navbar.map(item => {
        return <div>{item}</div>
      })}
    </div>
  );
}
```

### Server set up

- src/server/app.ts

```
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
```

Add a directory in `/src/server` called `run`, and create two files: `/src/server/dev.ts` and `/src/server/prod.ts`.

`dev.ts` should look like this:

```
import { runDevServer } from 'xpine';

runDevServer();
```

and can be run with an npm command like this in your package.json scripts: `"dev": "PORT=8888 LOCALHOST=1 xpine-dev"`.

The `prod.ts` should look like this:

```
import startServer from '../app';

await startServer();
```

and can be run with an npm command in your package.json scripts like this, after the app has been built with `xpine-build`:

`"start": "PORT=8888 node ./dist/server/run/prod.js"`

### xpine.config.mjs file

Add an xpine.config.mjs file to your root directory. This is used primarily for configuring/changing file paths. Configs can be imported with `import { config } from "xpine"`.

```
export default {}
```

These are the following default paths:

```
rootDir: process.cwd
srcDir: rootDir + ./src
distDir: rootDir + ./dist
packageJsonPath: rootDir + ./package.json
distPublicDir: distDir + ./public
distPublicScriptsDir: distPublicDir + ./scripts
distTempFolder: distDir + ./temp
clientJSBundlePath: distPublicScriptsDir + ./app.js
alpineDataPath: distTempFolder + ./alpine-data.ts
serverDistDir: distDir + ./server
serverDistAppPath: serverDistDir + ./app.js
pagesDir: srcDir + ./pages
distPagesDir: distDir + ./pages
publicDir: srcDir + ./public
serverDir: srcDir + ./server
runDir: serverDir + ./run
serverAppPath: serverDir + ./app.ts
globalCSSFile: publicDir + ./styles/global.css
```

### SPA interactivity

- data-spa="true"
  - transforms link into client side URL update
- data-persistent="id"
  - makes element persistent across pages that include the same persistent data-persistent tag
- data-spa-crossorigin="true"
  - enables cross-origin spa navigation requests (untested)

## API

### Build command

`xpine-build`

### Dev server command

`xpine-dev`

### Auth

`import { signUser, verifyUser } from 'xpine';`

### Config

`import { config } from 'xpine';`

### Env

```
import { setupEnv } from 'xpine';

await setupEnv();

```

setupEnv also supports AWS secrets manager. Simply add SECRETS_NAME=your_aws_secret_name to your .env.{stage} file

### Custom events
- spa-update-page-content
  - sent when the page content has update
- spa-update-page-url
  - sent when the page URL has update
- spa-link-click
  - sent when link initially gets clicked and when link is done updating content
  - the "state" value in the event detail will be "start" or "end"
- breakpoint-change
  - sent when a breakpoint is changed via your Tailwind css file's breakpoints in the @theme directive, e.g.
    ```
    @theme {
      --breakpoint-xl: 1184px;
      --breakpoint-sm: 640px;
      --breakpoint-md: 768px;
      --breakpoint-lg: 1024px;
    }
    ```
  - this will send a custom event with the detail being the breakpoint, such as `{ breakpoint: 'xl' }`
  - note this will only send an event based on the values of the breakpoints in your @theme configuration

### Custom scripts for certain pages

1. Add script to src/public/scripts/pages/your_script.ts
2. Import script into page HTML (e.g. `<script src="/scripts/pages/your_script.ts">`)
3. To unload event listeners, use `window.addEventListener('spa-update-page-url', () => { remove event listeners here})` in the code

### Separate client side bundles

You can create separate client side bundles in xpine.config.mjs like this:

```
export default {
  bundles: [
    {
      id: 'site',
      excludePaths: [
        // Excludes SecretPageData
        '/**/pages/secret/**/*.{js,ts,tsx,jsx}',
        '/**/pages/secret/*.{js,ts,tsx,jsx}',
      ],
    },
    {
      id: 'secret-page',
      includePaths: [
        // Only uses Alpine data coming from paths in this directory
        '/**/pages/secret/**/*.{js,ts,tsx,jsx}',
      ],
      requireAuthentication: true, // Only authenticated users can access this .js file
    }
  ]
}
```