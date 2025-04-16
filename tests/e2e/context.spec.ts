import { test, expect } from '@playwright/test';
import { url } from '../playwright.config';


test('context is present on static path', async ({ page }) => {
  await page.goto(url + '/boolean-static-path');
  const navContext1 = await page.getByTestId('navbar-context-pathD').getAttribute('data-index');
  const navContext2 = await page.getByTestId('navbar-context-page-sending-context').getAttribute('data-index');
  const navContext3 = await page.getByTestId('navbar-context-boolean-static-path').getAttribute('data-index');
  const navContext4 = await page.getByTestId('navbar-context-button').getAttribute('data-index');

  expect(navContext1).toEqual('0');
  expect(navContext2).toEqual('1');
  expect(navContext3).toEqual('2');
  expect(navContext4).toEqual('3');
});

test('context is present on non static path', async ({ page }) => {
  await page.goto(url);
  const navContext1 = await page.getByTestId('navbar-context-pathD').getAttribute('data-index');
  const navContext2 = await page.getByTestId('navbar-context-page-sending-context').getAttribute('data-index');
  const navContext3 = await page.getByTestId('navbar-context-boolean-static-path').getAttribute('data-index');
  const navContext4 = await page.getByTestId('navbar-context-button').getAttribute('data-index');

  expect(navContext1).toEqual('0');
  expect(navContext2).toEqual('1');
  expect(navContext3).toEqual('2');
  expect(navContext4).toEqual('3');
});
