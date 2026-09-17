import type { Page } from '@playwright/test';
import { expect } from './fixtures.ts';

export async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  for (const article of await page.getByRole('article').all()) {
    expect(await article.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );
  }
}
