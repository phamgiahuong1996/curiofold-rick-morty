import { test, expect } from './fixtures.ts';

test('Explore to Collections: favourites, groups and membership persist and can be cleared', async ({
  page,
}) => {
  const navigation = page.getByRole('navigation', { name: 'Primary', exact: true });
  const card = page.getByRole('article', { name: 'Rick Sanchez', exact: true });
  const group = page.getByRole('article', { name: 'Portal pals', exact: true });
  const membership = card.getByRole('checkbox', { name: 'Portal pals', exact: true });

  await test.step('discover, search and favourite a character', async () => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Explore');
    await expect(
      page.getByRole('list', { name: 'Characters', exact: true }).getByRole('article'),
    ).toHaveCount(3);
    await page.getByLabel('Search characters by name').fill('Rick');
    await page.getByLabel('Search characters by name').press('Enter');
    await expect(page).toHaveURL((url) => url.searchParams.get('q') === 'Rick');
    await expect(
      page.getByRole('list', { name: 'Characters', exact: true }).getByRole('article'),
    ).toHaveCount(1);
    const favourite = card.getByRole('button', { name: 'Favourite Rick Sanchez', exact: true });
    await favourite.focus();
    await page.keyboard.press('Space');
    await expect(card.getByRole('button', { name: 'Unfavourite Rick Sanchez' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  await test.step('create a group and add the favourite using the keyboard', async () => {
    await navigation.getByRole('link', { name: 'Collections' }).click();
    await expect(page.getByRole('main')).toBeFocused();
    await expect(navigation.getByRole('link', { name: 'Collections' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(card).toBeVisible();
    await page.getByLabel('Group name', { exact: true }).fill('  Portal pals  ');
    await page.getByRole('button', { name: 'Create group', exact: true }).click();
    await expect(page.getByLabel('Group name', { exact: true })).toBeFocused();
    await expect(page.getByRole('status')).toContainText('Created group “Portal pals”.');
    await expect(group.getByText('0 characters', { exact: true })).toBeVisible();
    await card.getByRole('button', { name: 'Manage groups for Rick Sanchez' }).click();
    await membership.focus();
    await page.keyboard.press('Space');
    await expect(membership).toBeChecked();
    await expect(group.getByRole('list', { name: 'Members of Portal pals' })).toContainText(
      'Rick Sanchez',
    );
  });

  await test.step('reload and verify persisted data through the UI', async () => {
    await page.reload();
    await card.getByRole('button', { name: 'Manage groups for Rick Sanchez' }).click();
    await expect(card.getByRole('button', { name: 'Unfavourite Rick Sanchez' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(membership).toBeChecked();
    await expect(group.getByText('1 character', { exact: true })).toBeVisible();
    await expect(group.getByRole('list', { name: 'Members of Portal pals' })).toContainText(
      'Rick Sanchez',
    );
  });

  await test.step('remove membership, unfavourite, delete and verify final empty states', async () => {
    await group.getByRole('button', { name: 'Remove Rick Sanchez from Portal pals' }).click();
    await expect(group.getByRole('heading', { name: 'Portal pals' })).toBeFocused();
    await expect(membership).not.toBeChecked();
    await expect(group.getByText(/No characters in this group/)).toBeVisible();
    await expect(page.getByRole('status')).toContainText(
      'Removed Rick Sanchez from “Portal pals”. Still in Favourites.',
    );
    const unfavourite = card.getByRole('button', { name: 'Unfavourite Rick Sanchez' });
    await unfavourite.focus();
    await page.keyboard.press('Enter');
    await expect(card).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Explore characters' })).toBeFocused();
    await expect(page.getByRole('heading', { name: 'No favourites yet' })).toBeVisible();
    await group.getByRole('button', { name: 'Delete group Portal pals' }).click();
    await expect(page.getByRole('heading', { name: 'Custom groups', exact: true })).toBeFocused();
    await expect(group).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'No groups yet' })).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Deleted group' })).toContainText(
      'Deleted group “Portal pals”. Its characters remain favourites.',
    );
    await page.reload();
    await expect(page.getByRole('heading', { name: 'No favourites yet' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'No groups yet' })).toBeVisible();
    await expect(page.getByRole('checkbox')).toHaveCount(0);
    await navigation.getByRole('link', { name: 'Explore' }).click();
    await expect(
      card.getByRole('button', { name: 'Favourite Rick Sanchez', exact: true }),
    ).toHaveAttribute('aria-pressed', 'false');
  });
});
