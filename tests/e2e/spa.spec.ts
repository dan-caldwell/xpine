import { test, expect } from '@playwright/test';
import { url } from '../playwright.config';


test('sticky nav creates request for page contents and does not reload page', async ({ page }) => {
  page.on('load', () => console.log('Page loaded!'));
  await page.goto(url);
  const link = page.getByTestId('navbar-boolean-static-path');
  await link.click();
  await page.waitForURL('**/boolean-static-path');
  await expect(page.getByTestId('navbar-boolean-static-path')).toBeAttached();
});

test('non-spa request for page contents reloads page', async ({ page }) => {
  await page.goto(url);
  const link = page.getByTestId('navbar-path-d-non-spa');
  page.on('load', () => console.log('Page loaded!'));
  await link.click();
  await page.waitForURL('**/my-path-a2/my-path-b2/my-path-c2/2');
  expect(await link.count()).toEqual(0);
});
