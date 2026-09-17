import { test, expect, characters } from './fixtures.ts';
import { expectNoHorizontalOverflow } from './responsive.ts';

for (const width of [375, 1280]) {
  test(`large collections keep group creation reachable and membership controls collapsed at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    const favourites = Array.from({ length: 100 }, (_, index) => ({
      ...characters[0],
      id: index + 1,
      name: `Discovery ${index + 1}`,
    }));
    await page.addInitScript(
      (ids) => {
        localStorage.setItem(
          'curiofold-collections',
          JSON.stringify({
            version: 0,
            state: {
              favouriteIds: ids,
              groups: Array.from({ length: 10 }, (_, index) => ({
                id: `group-${index}`,
                name: `Group ${index + 1}`,
                characterIds: [],
              })),
            },
          }),
        );
      },
      favourites.map((character) => character.id),
    );
    await page.route('https://rickandmortyapi.com/api/character/**', async (route) => {
      await route.fulfill({ json: favourites });
    });
    await page.goto('/collections');
    await expect(
      page.getByRole('list', { name: 'Characters', exact: true }).getByRole('article'),
    ).toHaveCount(100);
    await expect(page.getByRole('button', { name: 'Create group', exact: true })).toBeInViewport();
    await expect(page.getByRole('checkbox')).toHaveCount(0);
    const control = page.getByRole('button', {
      name: 'Manage groups for Discovery 1',
      exact: true,
    });
    await control.press('Enter');
    await expect(control).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('checkbox')).toHaveCount(10);
    await page.getByRole('checkbox', { name: 'Group 1', exact: true }).check();
    await expect(control).toHaveText('Groups (1)');
    await control.click();
    await expect(page.getByRole('checkbox')).toHaveCount(0);
    await page.getByRole('link', { name: 'Manage groups (10)', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Custom groups', exact: true })).toBeFocused();
    await expect(
      page.getByRole('heading', { name: 'Custom groups', exact: true }),
    ).toBeInViewport();
    await expectNoHorizontalOverflow(page);
  });
}
