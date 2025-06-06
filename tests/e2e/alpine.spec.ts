import { test, expect } from '@playwright/test';
import { url } from '../playwright.config';

test('pathD button changes color on button click', async ({ page }) => {
  await page.goto(url + '/my-path-a2/my-path-b2/my-path-c2/2');
  const button = page.getByTestId('path-d-button');
  const initialStyle = await button.getAttribute('style');
  expect(initialStyle).toEqual('background-color: red');
  await test.step('click button', async () => {
    await button.click();
    const newStyle = await button.getAttribute('style');
    expect(newStyle).toEqual('background-color: blue');
  });
});
