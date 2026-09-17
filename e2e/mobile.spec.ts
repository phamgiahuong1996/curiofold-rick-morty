import { test, expect } from './fixtures.ts';
import { expectNoHorizontalOverflow } from './responsive.ts';

test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

test('phone shell, search and favourite interaction reach Collections', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Explore' })).toBeVisible();
  const navigation = page.getByRole('navigation', { name: 'Primary', exact: true });
  await expect(navigation.getByRole('link', { name: 'Explore' })).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'Collections' })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Rick Sanchez', exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  const search = page.getByLabel('Search characters by name');
  await search.tap();
  await search.fill('Morty');
  // Exercise automatic search commitment on mobile.
  await expect(
    page.getByRole('list', { name: 'Characters', exact: true }).getByRole('article'),
  ).toHaveCount(1);
  const card = page.getByRole('article', { name: 'Morty Smith', exact: true });
  await card.getByRole('button', { name: 'Favourite Morty Smith', exact: true }).tap();
  await expect(card.getByRole('button', { name: 'Unfavourite Morty Smith' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expectNoHorizontalOverflow(page);
  await navigation.getByRole('link', { name: 'Collections' }).tap();
  await expect(page.getByRole('heading', { level: 1, name: 'Collections' })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Unfavourite Morty Smith' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
