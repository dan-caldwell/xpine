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
      <body data-time={Date.now()}>
        <div id="xpine-root">
          <script>
            var FF_FOUC_FIX;
          </script>
          {children}
        </div>
      </body>
    </html>
  );
}
