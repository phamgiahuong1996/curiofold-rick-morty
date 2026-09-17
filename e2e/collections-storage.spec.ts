import { test, expect } from './fixtures.ts';

test('simultaneous tab edits survive reload and deletions cannot resurrect memberships', async ({
  page,
  context,
}) => {
  const second = await context.newPage();
  await page.goto('/');
  await second.goto('/');
  await expect(
    page.getByRole('button', { name: 'Favourite Rick Sanchez', exact: true }),
  ).toBeVisible();
  await expect(
    second.getByRole('button', { name: 'Favourite Morty Smith', exact: true }),
  ).toBeVisible();

  // Hold the origin-wide write lock so both tabs edit the same starting snapshot.
  await page.evaluate(
    () =>
      new Promise<void>((ready) => {
        void navigator.locks.request(
          'curiofold-collections',
          () =>
            new Promise<void>((release) => {
              Reflect.set(window, 'releaseCollectionLock', release);
              ready();
            }),
        );
      }),
  );
  await page.getByRole('button', { name: 'Favourite Rick Sanchez', exact: true }).click();
  await second.getByRole('button', { name: 'Favourite Morty Smith', exact: true }).click();
  await page.evaluate(() => {
    const release: unknown = Reflect.get(window, 'releaseCollectionLock');
    if (typeof release === 'function') release();
    Reflect.deleteProperty(window, 'releaseCollectionLock');
  });
  for (const tab of [page, second]) {
    await expect(
      tab.getByRole('button', { name: 'Unfavourite Rick Sanchez', exact: true }),
    ).toBeVisible();
    await expect(
      tab.getByRole('button', { name: 'Unfavourite Morty Smith', exact: true }),
    ).toBeVisible();
    await tab.reload();
    await expect(
      tab.getByRole('button', { name: 'Unfavourite Rick Sanchez', exact: true }),
    ).toBeVisible();
    await expect(
      tab.getByRole('button', { name: 'Unfavourite Morty Smith', exact: true }),
    ).toBeVisible();
    await tab
      .getByRole('navigation', { name: 'Primary', exact: true })
      .getByRole('link', { name: 'Collections' })
      .click();
  }
  await page.getByLabel('Group name', { exact: true }).fill('Shared discoveries');
  await page.getByRole('button', { name: 'Create group', exact: true }).click();
  await expect(
    second.getByRole('article', { name: 'Shared discoveries', exact: true }),
  ).toBeVisible();
  await second.getByRole('button', { name: 'Manage groups for Rick Sanchez' }).click();
  await second.getByRole('checkbox', { name: 'Shared discoveries', exact: true }).check();
  await expect(page.getByRole('list', { name: 'Members of Shared discoveries' })).toContainText(
    'Rick Sanchez',
  );
  await page.getByRole('button', { name: 'Unfavourite Rick Sanchez', exact: true }).click();
  await expect(second.getByRole('article', { name: 'Rick Sanchez', exact: true })).toHaveCount(0);
  await expect(
    second.getByRole('article', { name: 'Shared discoveries', exact: true }),
  ).toContainText('0 characters');
  await second.getByRole('button', { name: 'Delete group Shared discoveries' }).click();
  await expect(page.getByRole('article', { name: 'Shared discoveries', exact: true })).toHaveCount(
    0,
  );
  await page
    .getByRole('navigation', { name: 'Primary', exact: true })
    .getByRole('link', { name: 'Explore' })
    .click();
  await page.getByRole('button', { name: 'Favourite Rick Sanchez', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Primary', exact: true })
    .getByRole('link', { name: 'Collections' })
    .click();
  await expect(page.getByRole('heading', { name: 'No groups yet' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('article', { name: 'Rick Sanchez', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No groups yet' })).toBeVisible();
});

test('storage failures show a recoverable warning and retry saves the pending collection', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.evaluate(() => {
    Reflect.set(window, 'collectionWritesBlocked', true);
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'curiofold-collections' && Reflect.get(window, 'collectionWritesBlocked'))
        throw new DOMException('Storage full', 'QuotaExceededError');
      original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: 'Favourite Rick Sanchez', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Keep this tab open');
  await expect(
    page.getByRole('button', { name: 'Unfavourite Rick Sanchez', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Primary', exact: true })
    .getByRole('link', { name: 'Collections' })
    .click();
  await page.getByLabel('Group name', { exact: true }).fill('Unsaved discoveries');
  await page.getByRole('button', { name: 'Create group', exact: true }).click();
  await page.getByRole('button', { name: 'Manage groups for Rick Sanchez' }).click();
  await page.getByRole('checkbox', { name: 'Unsaved discoveries' }).check();
  await expect(page.getByRole('alert')).toContainText('couldn’t be saved');
  await expect(page.getByRole('button', { name: 'Try saving again' })).toBeInViewport();
  expect(errors).toEqual([]);

  await page.evaluate(() => Reflect.set(window, 'collectionWritesBlocked', false));
  await page.getByRole('button', { name: 'Try saving again' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('main')).toBeFocused();
  await page.reload();
  await page.getByRole('button', { name: 'Manage groups for Rick Sanchez' }).click();
  await expect(page.getByRole('checkbox', { name: 'Unsaved discoveries' })).toBeChecked();
  expect(errors).toEqual([]);
});
