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


### SPA interactivity

- data-spa="true"
  - transforms link into client side URL update
- data-persistent="id"
  - makes element persistent across pages that include the same persistent data-persistent tag
- data-spa-crossorigin="true"
  - enables cross-origin spa navigation requests (untested)

#### Custom events
  - spa:updatePageContent
    - sent when the page content has update
  - spa:updatePageURL
    - send when the page URL has update

#### Custom scripts for certain pages

1. Add script to src/public/scripts/pages/your_script.ts
2. Import script into page HTML (e.g. <script src="/scripts/pages/your_script.ts">)
3. To unload event listeners, use `window.addEventListener('spa:updatePageURL', () => { remove event listeners here})` in the code