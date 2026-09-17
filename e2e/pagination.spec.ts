import { test, expect, characters } from './fixtures.ts';

for (const width of [375, 1280]) {
  test(`pagination returns focus and viewport to new results at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    const results = Array.from({ length: 40 }, (_, index) => ({
      ...characters[0],
      id: index + 1,
      name: `Discovery ${index + 1}`,
    }));
    await page.route('https://rickandmortyapi.com/api/character?**', async (route) => {
      const current = Number(new URL(route.request().url()).searchParams.get('page') ?? 1);
      await route.fulfill({
        json: {
          info: { count: 40, pages: 2 },
          results: results.slice((current - 1) * 20, current * 20),
        },
      });
    });
    await page.goto('/');
    await expect(page.getByRole('article')).toHaveCount(20);
    await page.getByRole('button', { name: 'Next page', exact: true }).press('Enter');
    await expect(page.getByRole('article').first()).toHaveAccessibleName('Discovery 21');
    const heading = page.getByRole('heading', { level: 2, name: 'Characters', exact: true });
    await expect(heading).toBeFocused();
    await expect(heading).toBeInViewport();
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('button', { name: 'Favourite Discovery 21', exact: true }),
    ).toBeFocused();

    // The return uses fresh cached data and must restore the results focus too.
    await page.getByRole('button', { name: 'Previous page', exact: true }).click();
    await expect(page.getByRole('article').first()).toHaveAccessibleName('Discovery 1');
    await expect(heading).toBeFocused();
    await expect(heading).toBeInViewport();
    const search = page.getByRole('searchbox');
    await search.fill('Discovery');
    await expect(page).toHaveURL((url) => url.searchParams.get('q') === 'Discovery');
    await expect(search).toBeFocused();
  });
}
