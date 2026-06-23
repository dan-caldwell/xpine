import { test, expect } from '@playwright/test';
import { config } from 'xpine';
import fs from 'fs-extra';
import path from 'path';
import http from 'http';
import { url } from '../playwright.config';

// Send a request with a raw, un-normalized path (browsers/fetch collapse "../",
// so we use http directly to faithfully reproduce an attacker's request).
function rawGet(rawPath: string): Promise<{ status: number; body: string }> {
  const target = new URL(url);
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: target.hostname, port: target.port, path: rawPath, method: 'GET' },
      res => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode || 0, body }));
      }
    );
    req.on('error', reject);
    req.end();
  });
}

test('app builds', async ({ page }) => {
  await page.goto(url);
  await expect(page.getByTestId('hello-world')).toHaveText('Hello world');
});

test('home page uses same file wrapper', async ({ page }) => {
  await page.goto(url);
  await expect(page.getByTestId('home-page-wrapper')).toBeAttached();
  expect(await page.getByTestId('base-config').count()).toEqual(0);
  const title = await page.title();
  expect(title).toEqual('Home page');
});

test('same dir +config uses config', async ({ page }) => {
  await page.goto(url + '/with-same-dir-wrapper');
  await expect(page.getByTestId('base-config')).toBeAttached();
  const title = await page.title();
  expect(title).toEqual('Default title');
});

test('dynamic paths with data in +config - path c', async ({ page }) => {
  const result = await page.goto(url + '/my-path-a/my-path-b/1');
  await expect(page.getByTestId('path-c-data')).toHaveText('sunt aut facere repellat provident occaecati excepturi optio reprehenderit');
  await expect(page.getByTestId('path-c-patha')).toHaveText('my-path-a');
  await expect(page.getByTestId('path-c-pathb')).toHaveText('my-path-b');
  await expect(page.getByTestId('base-config')).toBeAttached();
  const body = (await result.body()).toString();
  expect(body).toContain('<!-- static -->');
});

test('folder with named nested pages is static', async ({ page }) => {
  const result = await page.goto(url + '/folder-with-named-nested-pages-is-static/nested-folder-1/nested-named-route-1');
  await expect(page.getByTestId('nested-route-path')).toHaveText('/folder-with-named-nested-pages-is-static/nested-folder-1/nested-named-route-1');
  const body = (await result.body()).toString();
  expect(body).toContain('<!-- static -->');
});

test('dynamic inner paths with config in the component - path d', async ({ page }) => {
  const result = await page.goto(url + '/my-path-a2/my-path-b2/my-path-c2/2');
  await expect(page.getByTestId('path-d-data')).toHaveText('qui est esse');
  await expect(page.getByTestId('path-d-patha')).toHaveText('my-path-a2');
  await expect(page.getByTestId('path-d-pathb')).toHaveText('my-path-b2');
  await expect(page.getByTestId('path-d-pathc')).toHaveText('my-path-c2');
  await expect(page.getByTestId('base-config')).toBeAttached();
  const body = (await result.body()).toString();
  expect(body).toContain('<!-- static -->');
});

test('static paths exist for dynamic page', async () => {
  expect(fs.existsSync(path.join(config.distDir, './pages/my-path-a2/my-path-b2/my-path-c2/2/index.html'))).toEqual(true);
});

test('boolean static path', async ({ page }) => {
  const result = await page.goto(url + '/boolean-static-path');
  const body = (await result.body()).toString();
  expect(body).toContain('<!-- static -->');

  expect(fs.existsSync(path.join(config.distDir, './pages/boolean-static-path/index.html'))).toEqual(true);
});

test('inner static path override', async ({ page }) => {
  expect(fs.existsSync(path.join(config.distDir, './pages/base-static-path/index.html'))).toEqual(true);
  expect(fs.existsSync(path.join(config.distDir, './pages/base-static-path/non-static-path/index.html'))).toEqual(false);

  const staticResult = await page.goto(url + '/base-static-path');
  await expect(page.getByTestId('base-static-path')).toHaveText('My title');
  const staticBody = (await staticResult.body()).toString();
  expect(staticBody).toContain('<!-- static -->');

  const nonStaticResult = await page.goto(url + '/base-static-path/non-static-path');
  await expect(page.getByTestId('non-static-path')).toHaveText('My title');
  const nonStaticBody = (await nonStaticResult.body()).toString();
  expect(nonStaticBody).not.toContain('<!-- static -->');
});

test('dynamic path with static catch all', async ({ page }) => {
  const result = await page.goto(url + '/catch-all-route/page/123/456/789');
  const body = (await result.body()).toString();
  expect(body).toContain('<!-- static -->');
  expect(fs.existsSync(path.join(config.distDir, './pages/catch-all-route/page/123/456/789/index.html'))).toEqual(true);
});

test('multi-segment dynamic route - statically generated slug', async ({ page }) => {
  const result = await page.goto(url + '/blog/technology/devops/my-blog-post');
  await expect(page.getByTestId('blog-slug')).toHaveText('technology/devops/my-blog-post');
  const body = (await result.body()).toString();
  expect(body).toContain('<!-- static -->');
  expect(fs.existsSync(path.join(config.distDir, './pages/blog/technology/devops/my-blog-post/index.html'))).toEqual(true);
});

test('multi-segment dynamic route - slug validated at request time', async ({ page }) => {
  const result = await page.goto(url + '/blog/preview/2024/upcoming/launch-post');
  await expect(page.getByTestId('blog-slug')).toHaveText('preview/2024/upcoming/launch-post');
  const body = (await result.body()).toString();
  // Rendered dynamically via config.isValid, not from a prebuilt static file
  expect(body).not.toContain('<!-- static -->');
});

test('multi-segment dynamic route - unknown slug falls through to 404', async ({ page }) => {
  const result = await page.goto(url + '/blog/this-post-does-not-exist');
  expect(result.status()).toEqual(404);
  await expect(page.getByTestId('404-page')).toBeAttached();
  await expect(page.getByTestId('blog-slug')).toHaveCount(0);
});

test('static path serving cannot traverse outside the pages dir', async () => {
  // Plant a sentinel file as a sibling of the pages dir (outside it).
  const secret = 'TOP_SECRET_TRAVERSAL_SENTINEL';
  const sentinelDir = path.join(config.distDir, 'SENTINEL_TRAVERSAL');
  fs.ensureDirSync(sentinelDir);
  fs.writeFileSync(path.join(sentinelDir, 'index.html'), secret);
  try {
    // catch-all route at /pages/catch-all-route/page/x → 4x "../" reaches distDir
    const encoded = await rawGet('/catch-all-route/page/x/..%2f..%2f..%2f..%2fSENTINEL_TRAVERSAL');
    expect(encoded.body).not.toContain(secret);

    const raw = await rawGet('/catch-all-route/page/x/../../../../SENTINEL_TRAVERSAL');
    expect(raw.body).not.toContain(secret);
  } finally {
    fs.removeSync(sentinelDir);
  }
});

test('user input rendered through JSX is HTML-escaped (no XSS)', async () => {
  const res = await rawGet('/blog/preview/%3Cimg%20src=x%20onerror=alert(1)%3E');
  expect(res.body).not.toContain('<img src=x onerror=alert(1)>');
  expect(res.body).toContain('&lt;img src=x onerror=alert(1)&gt;');
});

test('catch all api endpoint', async ({ page }) => {
  const result = await page.goto(url + '/catch-all-route/api/my-awesome-param');
  const body = (await result.body()).toString();
  expect(body).toEqual('my-awesome-param');
});

test('regular API endpoint', async ({ page }) => {
  const result = await page.goto(url + '/api/my-cool-endpoint');
  const body = (await result.body()).toString();
  expect(body).toEqual('my-endpoint');
});

test('404 page uses config', async ({ page }) => {
  await page.goto(url + '/my-cool-404-page');
  await expect(page.getByTestId('404-page')).toHaveText('404 page not found');
  await expect(page.getByTestId('global-navbar')).toHaveText('Global navbar');
});

test('secret page does not include PathDData', async ({ page }) => {
  const data = fs.readFileSync(path.join(config.distDir, './public/scripts/secret-page.js'));
  expect(data.includes('PathDData')).toEqual(false);
});

test('home page includes PathDData', async ({ page }) => {
  const data = fs.readFileSync(path.join(config.distDir, './public/scripts/site.js'));
  expect(data.includes('PathDData')).toEqual(true);
});


test('home page does not include SecretPageData', async ({ page }) => {
  const data = fs.readFileSync(path.join(config.distDir, './public/scripts/site.js'));
  expect(data.includes('SecretPageData')).toEqual(false);
});

test('secret page does includes SecretPageData', async ({ page }) => {
  const data = fs.readFileSync(path.join(config.distDir, './public/scripts/secret-page.js'));
  expect(data.includes('SecretPageData')).toEqual(true);
});

test('secret page has no active breakpoint div', async ({ page }) => {
  await page.goto(url + '/secret');
  await expect(page.getByTestId('navbar-current-breakpoint')).toHaveCount(0);
});

test('pages script is created', async ({ page }) => {
  const data = fs.readFileSync(path.join(config.distDir, './public/scripts/pages/test-page/sw.js'));
  expect(data.includes('pages-test')).toEqual(true);
  expect(data.includes('Alpine')).toEqual(false);
});

test('standalone files created', async ({ page }) => {
  const data = fs.readFileSync(path.join(config.distDir, './public/apps/test/sw.js'));
  expect(data.includes('sw-test-on-standalone')).toEqual(true);
  expect(data.includes('Alpine')).toEqual(false);
  const buildData = fs.readFileSync(path.join(config.distDir, './public/scripts/site.js'));
  expect(buildData.includes('sw-test-on-standalone')).toEqual(false);
});

test('standalone json file created', async ({ page }) => {
  const data = fs.readFileSync(path.join(config.distDir, './public/apps/test/manifest.json'));
  expect(data.includes('test-json')).toEqual(true);
});