import { test, expect } from '@playwright/test';
import { url } from '../playwright.config';


test('sticky nav creates request for page contents and does not reload page', async ({ page }) => {
  await page.goto(url);
  const link = page.getByTestId('navbar-boolean-static-path');
  const navbarNow = await page.getByTestId('navbar-now').getAttribute('data-now');
  await link.click();
  await page.waitForURL('**/boolean-static-path');
  const newNavbarNow = await page.getByTestId('navbar-now').getAttribute('data-now');
  expect(navbarNow).toEqual(newNavbarNow);
});

test('non-spa request for page contents reloads page', async ({ page }) => {
  await page.goto(url);
  const link = page.getByTestId('navbar-non-static-path-non-spa');
  const navbarNow = await page.getByTestId('navbar-now').getAttribute('data-now');
  await link.click();
  await page.waitForURL('**/base-static-path/non-static-path');
  const newNavbarNow = await page.getByTestId('navbar-now').getAttribute('data-now');
  expect(navbarNow).not.toEqual(newNavbarNow);
});

test('path param works for static page', async ({ page }) => {
  await page.goto(url + '/my-path-a2/my-path-b2/my-path-c2/2');
  const urlPath = await page.getByTestId('url-path').getAttribute('data-path');
  expect(urlPath).toEqual('/my-path-a2/my-path-b2/my-path-c2/2');
});

test('path param works for home page', async ({ page }) => {
  await page.goto(url + '/');
  const urlPath = await page.getByTestId('url-path').getAttribute('data-path');
  expect(urlPath).toEqual('/');
});

test('path param works for non-static page', async ({ page }) => {
  await page.goto(url + '/page-sending-context');
  const urlPath = await page.getByTestId('url-path').getAttribute('data-path');
  expect(urlPath).toEqual('/page-sending-context');
});

test('path from inside page works', async ({ page }) => {
  await page.goto(url + '/page-sending-context');
  const urlPath = await page.getByTestId('path-from-page').getAttribute('data-path');
  expect(urlPath).toEqual('/page-sending-context');
});
