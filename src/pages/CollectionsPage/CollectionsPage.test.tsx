import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { expect, test } from 'vitest';

import { collectionsPersistence, useCollectionsStore } from '../../features/collections';
import { characterApiUrl, morty, rick } from '../../test/fixtures';
import { renderApp } from '../../test/render';
import { server } from '../../test/server';

const state = () => useCollectionsStore.getState();

test('unfavourite keeps the remaining card mounted and reuses fresh batch data without a request', async () => {
  state().addFavourite(1);
  state().addFavourite(2);
  state().addCharacterToGroup(state().createGroup('Portal pals')!, 2);
  const requests: string[] = [];
  server.use(
    http.get(`${characterApiUrl}/:ids`, ({ params }) => {
      requests.push(String(params.ids));
      return HttpResponse.json([rick, morty]);
    }),
  );
  const user = userEvent.setup();
  const { client } = renderApp('/collections');
  const remainingCard = await screen.findByRole('article', { name: morty.name });
  await user.click(
    within(remainingCard).getByRole('button', { name: 'Manage groups for Morty Smith' }),
  );
  const checkbox = within(remainingCard).getByRole('checkbox', { name: 'Portal pals' });
  await user.click(screen.getByRole('button', { name: 'Unfavourite Rick Sanchez' }));
  expect(screen.queryByRole('article', { name: rick.name })).not.toBeInTheDocument();
  expect(screen.getByRole('article', { name: morty.name })).toBe(remainingCard);
  expect(within(remainingCard).getByRole('checkbox', { name: 'Portal pals' })).toBe(checkbox);
  expect(checkbox).toBeChecked();
  expect(screen.getByRole('button', { name: 'Unfavourite Morty Smith' })).toHaveFocus();
  expect(screen.queryByText('Loading favourites…')).not.toBeInTheDocument();
  await waitFor(() =>
    expect(client.getQueryState(['characters', 'byIds', [2]])?.fetchStatus).toBe('idle'),
  );
  expect(requests).toEqual(['1,2']);
});

test('stale batch data keeps the remaining card and member name during background refresh and failure', async () => {
  state().addFavourite(1);
  state().addFavourite(2);
  state().addCharacterToGroup(state().createGroup('Portal pals')!, 1);
  let release = () => {};
  const response = new Promise<void>((resolve) => {
    release = resolve;
  });
  const requests: string[] = [];
  server.use(
    http.get(`${characterApiUrl}/:ids`, async ({ params }) => {
      requests.push(String(params.ids));
      if (params.ids === '1,2') return HttpResponse.json([rick, morty]);
      await response;
      return new HttpResponse(null, { status: 503 });
    }),
  );
  const user = userEvent.setup();
  const { client } = renderApp('/collections');
  const remainingCard = await screen.findByRole('article', { name: rick.name });
  const updatedAt = Date.now() - 10 * 60_000;
  act(() => client.setQueryData(['characters', 'byIds', [1, 2]], [rick, morty], { updatedAt }));
  await user.click(screen.getByRole('button', { name: 'Unfavourite Morty Smith' }));
  await waitFor(() => expect(requests).toEqual(['1,2', '1']));
  expect(client.getQueryState(['characters', 'byIds', [1]])?.dataUpdatedAt).toBe(updatedAt);
  expect(screen.getByRole('article', { name: rick.name })).toBe(remainingCard);
  expect(screen.getByRole('button', { name: 'Unfavourite Rick Sanchez' })).toHaveFocus();
  expect(screen.queryByText('Loading favourites…')).not.toBeInTheDocument();
  expect(
    within(screen.getByRole('article', { name: 'Portal pals' })).getByRole('list'),
  ).toHaveTextContent(rick.name);
  release();
  expect(await screen.findByRole('alert')).toHaveTextContent('Favourites are out of reach');
  expect(screen.getByRole('article', { name: rick.name })).toBe(remainingCard);
  server.use(
    http.get(`${characterApiUrl}/:ids`, () =>
      HttpResponse.json({ ...rick, location: { name: 'Earth' } }),
    ),
  );
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  await waitFor(() => expect(within(remainingCard).getByText('Earth')).toBeInTheDocument());
  expect(screen.getByRole('article', { name: rick.name })).toBe(remainingCard);
});

test('partial cache data cannot replace the initial loading of missing favourite details', async () => {
  state().addFavourite(1);
  const { client } = renderApp('/collections');
  await screen.findByRole('article', { name: rick.name });
  let release = () => {};
  const response = new Promise<void>((resolve) => {
    release = resolve;
  });
  server.use(
    http.get(`${characterApiUrl}/:ids`, async () => {
      await response;
      return HttpResponse.json([rick, morty]);
    }),
  );
  act(() => state().addFavourite(2));
  expect(screen.getByText('Loading favourites…')).toBeInTheDocument();
  expect(client.getQueryData(['characters', 'byIds', [1, 2]])).toBeUndefined();
  release();
  expect(await screen.findByRole('article', { name: morty.name })).toBeInTheDocument();
});

test('empty favourites and groups explain how to start, with a working Explore link', async () => {
  const user = userEvent.setup();
  renderApp('/collections');
  expect(screen.getByRole('heading', { name: 'No favourites yet' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'No groups yet' })).toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: 'Explore characters' }));
  expect(await screen.findByRole('article', { name: rick.name })).toBeInTheDocument();
});

test('favourite IDs fetch current API details and loading is announced', async () => {
  state().addFavourite(1);
  let requestedIds = '';
  server.use(
    http.get(`${characterApiUrl}/:ids`, async ({ params }) => {
      requestedIds = String(params.ids);
      await delay(100);
      return HttpResponse.json({ ...rick, name: 'Rick from the API' });
    }),
  );
  renderApp('/collections');
  expect(screen.getByText('Loading favourites…')).toHaveAttribute('role', 'status');
  const card = await screen.findByRole('article', { name: 'Rick from the API' });
  expect(
    within(card).getByRole('button', { name: 'Unfavourite Rick from the API' }),
  ).toHaveAttribute('aria-pressed', 'true');
  expect(requestedIds).toBe('1');
  expect(state().favouriteIds).toEqual([1]);
});

test('creates a trimmed group and adds/removes a favourite with keyboard accessible checkboxes', async () => {
  state().addFavourite(1);
  const user = userEvent.setup();
  renderApp('/collections');
  const card = await screen.findByRole('article', { name: rick.name });
  await user.type(screen.getByRole('textbox', { name: 'Group name' }), '  Portal pals  ');
  await user.click(screen.getByRole('button', { name: 'Create group' }));
  const group = screen.getByRole('article', { name: 'Portal pals' });
  expect(within(group).getByText(/No characters in this group/)).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Group name' })).toHaveValue('');
  expect(screen.getByRole('textbox', { name: 'Group name' })).toHaveFocus();
  await user.click(within(card).getByRole('button', { name: 'Manage groups for Rick Sanchez' }));
  const control = within(card).getByRole('group', { name: 'Groups for Rick Sanchez' });
  const checkbox = within(control).getByRole('checkbox', { name: 'Portal pals' });
  expect(checkbox).not.toBeChecked();
  checkbox.focus();
  await user.keyboard(' ');
  expect(checkbox).toBeChecked();
  expect(within(group).getByRole('list', { name: 'Members of Portal pals' })).toHaveTextContent(
    rick.name,
  );
  await user.keyboard(' ');
  expect(checkbox).not.toBeChecked();
  expect(within(group).queryByRole('list')).not.toBeInTheDocument();
  await user.click(checkbox);
  await user.click(
    within(group).getByRole('button', { name: 'Remove Rick Sanchez from Portal pals' }),
  );
  expect(checkbox).not.toBeChecked();
  expect(within(group).getByText(/No characters in this group/)).toBeInTheDocument();
  expect(within(group).getByRole('heading', { name: 'Portal pals' })).toHaveFocus();
  expect(screen.getByRole('status')).toHaveTextContent(
    'Removed Rick Sanchez from “Portal pals”. Still in Favourites.',
  );
  expect(
    within(card).getByRole('button', { name: 'Unfavourite Rick Sanchez' }),
  ).toBeInTheDocument();
});

test('rejects a blank group with accessible feedback', async () => {
  const user = userEvent.setup();
  renderApp('/collections');
  await user.type(screen.getByRole('textbox', { name: 'Group name' }), '   ');
  await user.click(screen.getByRole('button', { name: 'Create group' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Enter a group name');
  expect(screen.getByRole('textbox', { name: 'Group name' })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  expect(state().groups).toEqual([]);
  expect(screen.getByRole('textbox', { name: 'Group name' })).toHaveFocus();
});

test('deletes a populated group while keeping its favourite card', async () => {
  state().addFavourite(1);
  const id = state().createGroup('Portal pals')!;
  state().addCharacterToGroup(id, 1);
  const user = userEvent.setup();
  renderApp('/collections');
  const card = await screen.findByRole('article', { name: rick.name });
  await user.click(screen.getByRole('button', { name: 'Delete group Portal pals' }));
  expect(screen.queryByRole('article', { name: 'Portal pals' })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'No groups yet' })).toBeInTheDocument();
  expect(card).toBeInTheDocument();
  expect(state().favouriteIds).toEqual([1]);
  expect(screen.getByRole('heading', { name: 'Custom groups' })).toHaveFocus();
});

test.each([
  ['Earth', 'Portal pals'],
  ['Portal pals', 'Citadel'],
  ['Citadel', 'Portal pals'],
])('deleting %s moves focus to the neighbouring group %s', async (deleted, focused) => {
  for (const name of ['Earth', 'Portal pals', 'Citadel']) state().createGroup(name);
  const user = userEvent.setup();
  renderApp('/collections');
  await user.click(screen.getByRole('button', { name: `Delete group ${deleted}` }));
  expect(screen.queryByRole('article', { name: deleted })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: focused })).toHaveFocus();
  await user.tab();
  expect(screen.getByRole('button', { name: `Delete group ${focused}` })).toHaveFocus();
});

test('unfavouriting removes a character from every rendered group and its favourite card', async () => {
  state().addFavourite(1);
  for (const name of ['Portal pals', 'Earth']) {
    state().addCharacterToGroup(state().createGroup(name)!, 1);
  }
  const user = userEvent.setup();
  renderApp('/collections');
  await screen.findByRole('article', { name: rick.name });
  await user.click(screen.getByRole('button', { name: 'Manage groups for Rick Sanchez' }));
  expect(screen.getAllByRole('checkbox')).toHaveLength(2);
  expect(
    screen.getAllByRole('checkbox').every((checkbox) => (checkbox as HTMLInputElement).checked),
  ).toBe(true);
  await user.click(screen.getByRole('button', { name: 'Unfavourite Rick Sanchez' }));
  expect(screen.queryByRole('article', { name: rick.name })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'No favourites yet' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Explore characters' })).toHaveFocus();
  expect(screen.getByText('Unfavourited Rick Sanchez. Removed from all groups.')).toHaveAttribute(
    'role',
    'status',
  );
  for (const name of ['Portal pals', 'Earth']) {
    expect(
      within(screen.getByRole('article', { name })).getByText(/No characters in this group/),
    ).toBeInTheDocument();
  }
});

test('favourite API errors preserve collection metadata and retry recovers', async () => {
  state().addFavourite(1);
  state().addCharacterToGroup(state().createGroup('Portal pals')!, 1);
  server.use(http.get(`${characterApiUrl}/:ids`, () => new HttpResponse(null, { status: 503 })));
  const user = userEvent.setup();
  renderApp('/collections');
  expect(await screen.findByRole('alert')).toHaveTextContent('Favourites are out of reach');
  expect(
    within(screen.getByRole('article', { name: 'Portal pals' })).getByText('Character #1'),
  ).toBeInTheDocument();
  expect(state().favouriteIds).toEqual([1]);
  server.use(http.get(`${characterApiUrl}/:ids`, () => HttpResponse.json(rick)));
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByRole('article', { name: rick.name })).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(
    within(screen.getByRole('article', { name: 'Portal pals' })).getByRole('list'),
  ).toHaveTextContent(rick.name);
});

test('persisted favourites and group memberships render after rehydration', async () => {
  const user = userEvent.setup();
  localStorage.setItem(
    'curiofold-collections',
    JSON.stringify({
      state: {
        favouriteIds: [1],
        groups: [{ id: 'saved-group', name: 'Saved discoveries', characterIds: [1] }],
      },
      version: 0,
    }),
  );
  collectionsPersistence.rehydrate();
  renderApp('/collections');
  const card = await screen.findByRole('article', { name: rick.name });
  await user.click(within(card).getByRole('button', { name: 'Manage groups for Rick Sanchez' }));
  expect(within(card).getByRole('checkbox', { name: 'Saved discoveries' })).toBeChecked();
  expect(
    within(screen.getByRole('article', { name: 'Saved discoveries' })).getByRole('list'),
  ).toHaveTextContent(rick.name);
});
