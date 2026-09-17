import { test, expect, characters } from './fixtures.ts';
import { expectNoHorizontalOverflow } from './responsive.ts';

for (const width of [375, 768, 1280, 1600]) {
  test(`Explore and Collections fit ${width}px with long names and reduced motion`, async ({
    page,
    characterApi,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    // Check the first keyboard stop and native skip-link focus in a real browser.
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    const longCard = page.getByRole('article', { name: characters[2].name, exact: true });
    await expect(
      longCard.getByRole('img', { name: `Portrait unavailable for ${characters[2].name}` }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByRole('button', { name: 'Favourite Rick Sanchez', exact: true }).click();
    await longCard
      .getByRole('button', { name: `Favourite ${characters[2].name}`, exact: true })
      .click();
    await page
      .getByRole('navigation', { name: 'Primary', exact: true })
      .getByRole('link', { name: 'Collections' })
      .click();
    await expect(page.getByRole('main')).toBeFocused();
    await expect(
      page.getByRole('list', { name: 'Characters', exact: true }).getByRole('article'),
    ).toHaveCount(2);
    // Confirm a batch lookup is exercised without coupling to ID order or request counts.
    expect(characterApi.some((path) => /^\/api\/character\/\d+(,\d+)+$/.test(path))).toBe(true);
    const groupName = 'DiscoveriesFromAnUnexpectedParallelDimension'.repeat(3);
    await page.getByLabel('Group name', { exact: true }).fill(groupName);
    await page.getByRole('button', { name: 'Create group', exact: true }).click();
    await longCard.getByRole('button', { name: `Manage groups for ${characters[2].name}` }).click();
    await longCard.getByRole('checkbox', { name: groupName, exact: true }).check();
    const group = page.getByRole('article', { name: groupName, exact: true });
    await expect(group.getByRole('list', { name: `Members of ${groupName}` })).toContainText(
      characters[2].name,
    );
    await expectNoHorizontalOverflow(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    for (const button of await page.getByRole('button').all()) {
      const bounds = await button.boundingBox();
      expect(bounds?.height).toBeGreaterThanOrEqual(44);
      expect(bounds?.width).toBeGreaterThanOrEqual(44);
    }
    const checkbox = longCard.getByRole('checkbox', { name: groupName, exact: true });
    await checkbox.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(checkbox).toBeFocused();
    expect(await checkbox.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe(
      'solid',
    );
    expect(await longCard.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe(
      '0s',
    );
    expect(
      await checkbox.evaluate(
        (element) => getComputedStyle(element.parentElement!).transitionDuration,
      ),
    ).toBe('0s');
  });
}
