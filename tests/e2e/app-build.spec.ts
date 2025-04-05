import { test, expect } from '@playwright/test';

const url = `http://127.0.0.1:${process.env.PORT}`;

test('app builds', async ({ page}) => {
  await page.goto(url);
  await expect(page.getByTestId('hello-world')).toHaveText('Hello world');
});

test('home page uses same file wrapper', async ({ page }) => {
  await page.goto(url);
  await expect(page).toHaveTitle('My awesome website');
});

// test('has title', async ({ page }) => {
//   await page.goto('https://playwright.dev/');

//   // Expect a title "to contain" a substring.
//   await expect(page).toHaveTitle(/Playwright/);
// });

// test('get started link', async ({ page }) => {
//   await page.goto('https://playwright.dev/');

//   // Click the get started link.
//   await page.getByRole('link', { name: 'Get started' }).click();

//   // Expects page to have a heading with the name of Installation.
//   await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
// });
