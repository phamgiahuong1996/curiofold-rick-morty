import { test, expect } from './fixtures.ts';

for (const width of [375, 1280]) {
  test(`deleting groups keeps focus and viewport in group management at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.addInitScript(() => {
      localStorage.setItem(
        'curiofold-collections',
        JSON.stringify({
          version: 0,
          state: {
            favouriteIds: [1, 2],
            groups: ['Earth', 'Portal pals', 'Citadel'].map((name, index) => ({
              id: `group-${index}`,
              name,
              characterIds: [1],
            })),
          },
        }),
      );
    });
    await page.goto('/collections');
    await expect(page.getByRole('article', { name: 'Morty Smith', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Manage groups (3)', exact: true }).click();

    for (const [deleted, focused] of [
      ['Portal pals', 'Citadel'],
      ['Citadel', 'Earth'],
      ['Earth', 'Custom groups'],
    ]) {
      await page
        .getByRole('button', { name: `Delete group ${deleted}`, exact: true })
        .press('Enter');
      await expect(page.getByRole('article', { name: deleted, exact: true })).toHaveCount(0);
      const heading = page.getByRole('heading', { name: focused, exact: true });
      await expect(heading).toBeFocused();
      await expect(heading).toBeInViewport();
      await expect(page.getByLabel('Group name', { exact: true })).not.toBeInViewport();
    }
    await expect(page.getByRole('heading', { name: 'No groups yet' })).toBeVisible();
    await expect(page.getByRole('article', { name: 'Rick Sanchez', exact: true })).toBeVisible();
  });
}

test('unfavourite preserves other cards, membership and nearby focus without reloading', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 600 });
  let documents = 0;
  page.on('request', (request) => {
    if (request.resourceType() === 'document') documents += 1;
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Favourite Rick Sanchez', exact: true }).click();
  await page.getByRole('button', { name: 'Favourite Morty Smith', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Primary', exact: true })
    .getByRole('link', { name: 'Collections' })
    .click();
  const rick = page.getByRole('article', { name: 'Rick Sanchez', exact: true });
  const morty = page.getByRole('article', { name: 'Morty Smith', exact: true });
  await expect(morty).toBeVisible();
  await page.getByLabel('Group name', { exact: true }).fill('Portal pals');
  await page.getByRole('button', { name: 'Create group', exact: true }).click();
  await rick.getByRole('button', { name: 'Manage groups for Rick Sanchez' }).click();
  await rick.getByRole('checkbox', { name: 'Portal pals' }).check();
  const originalCard = await rick.elementHandle();
  const originalCheckbox = await rick
    .getByRole('checkbox', { name: 'Portal pals' })
    .elementHandle();
  await morty.getByRole('button', { name: 'Unfavourite Morty Smith' }).click();
  await expect(morty).toHaveCount(0);
  await expect(rick).toBeVisible();
  expect(await originalCard!.evaluate((element) => element.isConnected)).toBe(true);
  expect(await originalCheckbox!.evaluate((element) => element.isConnected)).toBe(true);
  await expect(rick.getByRole('checkbox', { name: 'Portal pals' })).toBeChecked();
  const focusedFavourite = rick.getByRole('button', { name: 'Unfavourite Rick Sanchez' });
  await expect(focusedFavourite).toBeFocused();
  // Wait for scrolling to settle; allow at most one CSS pixel of subpixel rounding.
  await expect
    .poll(
      () =>
        focusedFavourite.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          return Math.max(0, -bounds.top, bounds.bottom - window.innerHeight);
        }),
      { message: 'Focused favourite stays within the viewport (1px tolerance)' },
    )
    .toBeLessThanOrEqual(1);
  await expect(page.getByText('Loading favourites…', { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('article', { name: 'Portal pals', exact: true }).getByRole('list'),
  ).toContainText('Rick Sanchez');
  expect(documents).toBe(1);
  await rick.getByRole('button', { name: 'Unfavourite Rick Sanchez' }).press('Enter');
  await expect(page.getByRole('heading', { name: 'No favourites yet' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Explore characters' })).toBeFocused();
  expect(documents).toBe(1);
});
