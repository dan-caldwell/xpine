import { test, expect } from '@playwright/test';
import { config } from 'xpine';
import fs from 'fs-extra';
import path from 'path';
import { url } from '../playwright.config';

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