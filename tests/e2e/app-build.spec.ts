import { test, expect } from '@playwright/test';
import { config } from 'xpine';
import fs from 'fs-extra';
import path from 'path';

const url = `http://127.0.0.1:${process.env.PORT}`;

test('app builds', async ({ page}) => {
  await page.goto(url);
  await expect(page.getByTestId('hello-world')).toHaveText('Hello world');
});

test('home page uses same file wrapper', async ({ page }) => {
  await page.goto(url);
  await expect(page.getByTestId('home-page-wrapper')).toBeAttached();
  expect(await page.getByTestId('base-config').count()).toEqual(0);
});

test('same dir +config uses config', async ({ page }) => {
  await page.goto(url + '/with-same-dir-wrapper');
  await expect(page.getByTestId('base-config')).toBeAttached();
});

test('dynamic paths with data in +config', async ({ page }) => {
  await page.goto(url + '/my-path-a/my-path-b/1');
  await expect(page.getByTestId('path-c-data')).toHaveText('sunt aut facere repellat provident occaecati excepturi optio reprehenderit');
  await expect(page.getByTestId('path-c-patha')).toHaveText('my-path-a');
  await expect(page.getByTestId('path-c-pathb')).toHaveText('my-path-b');
  await expect(page.getByTestId('base-config')).toBeAttached();
});

test('dynamic inner paths with config in the component', async ({ page}) => {
  await page.goto(url + '/my-path-a2/my-path-b2/my-path-c2/2');
  await expect(page.getByTestId('path-d-data')).toHaveText('qui est esse');
  await expect(page.getByTestId('path-d-patha')).toHaveText('my-path-a2');
  await expect(page.getByTestId('path-d-pathb')).toHaveText('my-path-b2');
  await expect(page.getByTestId('path-d-pathc')).toHaveText('my-path-c2');
  await expect(page.getByTestId('base-config')).toBeAttached();
});

test('static paths exist for dynamic page', async () => {
  expect(fs.existsSync(path.join(config.distDir, './pages/my-path-a2/my-path-b2/my-path-c2/2/index.html'))).toEqual(true);
});

test('boolean static path', async () => {
  expect(fs.existsSync(path.join(config.distDir, './pages/boolean-static-path/index.html'))).toEqual(true);
});

test('inner static path override', async ({ page }) => {
  expect(fs.existsSync(path.join(config.distDir, './pages/base-static-path/index.html'))).toEqual(true);
  expect(fs.existsSync(path.join(config.distDir, './pages/base-static-path/non-static-path/index'))).toEqual(false);

  await page.goto(url + '/base-static-path');
  await expect(page.getByTestId('base-static-path')).toHaveText('My title');

  await page.goto(url + '/base-static-path/non-static-path');
  await expect(page.getByTestId('non-static-path')).toHaveText('My title');
});