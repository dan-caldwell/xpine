# XPine - Alpine.js + JSX + Tailwind framework

Combines JSX with Alpine.js for a simpler, easier development experience.

## Get started

Add an xpine.config.mjs file to your root directory

```
export default {}
```

## API

### Build

`xpine-build`

## Auth

`import { signUser, verifyUser } from 'xpine';`

## Dev server

`xpine-dev`

## Config

`import { config } from 'xpine';`

## Env

```
import { setupEnv } from 'xpine';

await setupEnv();

```

setupEnv also supports AWS secrets manager. Simply add SECRETS_NAME=your_aws_secret_name to your .env.{stage} file

## Router

`import { createXPineRouter } from 'xpine';`

- Catch all routes
  - You can create catch all routes by naming the file _all_.(jsx|tsx|js|ts)
  - You can make static catch all route pages by using the param `0` in the staticPaths config function:
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
  - You can get the route param in your function with req.params[0], such as how express handles catch all routes


### SPA interactivity

- data-spa="true"
  - transforms link into client side URL update
- data-persistent="id"
  - makes element persistent across pages that include the same persistent data-persistent tag
- data-spa-crossorigin="true"
  - enables cross-origin spa navigation requests (untested)

#### Custom events
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

#### Custom scripts for certain pages

1. Add script to src/public/scripts/pages/your_script.ts
2. Import script into page HTML (e.g. <script src="/scripts/pages/your_script.ts">)
3. To unload event listeners, use `window.addEventListener('spa-update-page-url', () => { remove event listeners here})` in the code