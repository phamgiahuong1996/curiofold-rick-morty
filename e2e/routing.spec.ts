import { test, expect } from './fixtures.ts';

const routes = [
  { path: '/', heading: 'Explore' },
  { path: '/collections', heading: 'Collections' },
  { path: '/uncharted-route', heading: 'Page not found' },
];

for (const { path, heading } of routes) {
  test(`production preview supports direct navigation and refresh at ${path}`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.ok()).toBe(true);
    await expect(page.getByRole('heading', { level: 1, name: heading, exact: true })).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL((url) => url.pathname === path);
    await expect(page.getByRole('heading', { level: 1, name: heading, exact: true })).toBeVisible();

    if (path === '/') {
      await expect(page.getByRole('article', { name: 'Rick Sanchez', exact: true })).toBeVisible();
    } else if (path === '/collections') {
      await expect(page.getByRole('heading', { name: 'No favourites yet' })).toBeVisible();
    } else {
      await page.getByRole('link', { name: 'Back to Explore' }).click();
      await expect(
        page.getByRole('heading', { level: 1, name: 'Explore', exact: true }),
      ).toBeVisible();
    }
  });
}
