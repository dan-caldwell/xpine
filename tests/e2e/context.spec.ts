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
  const navContext2Date1 = await page.getByTestId('navbar-context-page-sending-context-date-1').getAttribute('data-index');
  const navContext2Date2 = await page.getByTestId('navbar-context-page-sending-context-date-2').getAttribute('data-index');
  const navContext2Date3 = await page.getByTestId('navbar-context-page-sending-context-date-3').getAttribute('data-index');
  const navContext3 = await page.getByTestId('navbar-context-boolean-static-path').getAttribute('data-index');
  const navContext4 = await page.getByTestId('navbar-context-button').getAttribute('data-index');

  expect(navContext1).toEqual('0');
  expect(navContext2).toEqual('1');
  expect(navContext3).toEqual('2');
  expect(navContext4).toEqual('3');
  expect(navContext2Date3).toEqual('4');
  expect(navContext2Date1).toEqual('5');
  expect(navContext2Date2).toEqual('6');
});
