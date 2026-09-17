import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { expect, test } from 'vitest';

import { characterApiUrl, characterPage, morty, rick } from '../../test/fixtures';
import { renderApp } from '../../test/render';
import { server } from '../../test/server';

test('characters render as labelled articles with useful information', async () => {
  renderApp();
  const card = await screen.findByRole('article', { name: 'Rick Sanchez' });
  expect(within(card).getByRole('img', { name: 'Rick Sanchez portrait' })).toBeInTheDocument();
  expect(within(card).getByText('Alive · Human')).toBeInTheDocument();
  expect(within(card).getByText('Citadel of Ricks')).toBeInTheDocument();
  expect(screen.getByRole('list', { name: 'Characters' })).toBeInTheDocument();
});

test('card favourite controls toggle immediately by keyboard and pointer without changing the URL', async () => {
  const user = userEvent.setup();
  const { router } = renderApp('/?q=rick&page=2');
  const button = await screen.findByRole('button', { name: 'Favourite Rick Sanchez' });
  expect(button).toHaveAttribute('aria-pressed', 'false');
  button.focus();
  await user.keyboard(' ');
  expect(screen.getByRole('button', { name: 'Unfavourite Rick Sanchez' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await user.click(screen.getByRole('button', { name: 'Unfavourite Rick Sanchez' }));
  expect(button).toHaveAttribute('aria-pressed', 'false');
  expect(router.state.location.search).toBe('?q=rick&page=2');
});

test('typing commits a trimmed search to the URL after a debounce', async () => {
  const user = userEvent.setup();
  const { router } = renderApp();
  await screen.findByRole('article', { name: 'Rick Sanchez' });
  await user.type(screen.getByRole('searchbox', { name: 'Search characters by name' }), ' rick ');
  expect(router.state.location.search).toBe('');
  await waitFor(() =>
    expect(new URLSearchParams(router.state.location.search).get('q')).toBe('rick'),
  );
  expect(new URLSearchParams(router.state.location.search).get('page')).toBe('1');
});

test('changing the committed search resets page to one', async () => {
  const user = userEvent.setup();
  const { router } = renderApp('/?q=rick&page=2');
  const input = screen.getByRole('searchbox', { name: 'Search characters by name' });
  await user.clear(input);
  await user.type(input, 'morty');
  await waitFor(() =>
    expect(new URLSearchParams(router.state.location.search).get('q')).toBe('morty'),
  );
  expect(new URLSearchParams(router.state.location.search).get('page')).toBe('1');
});

test('clearing search restores all characters and returns focus to the input', async () => {
  const user = userEvent.setup();
  const { router } = renderApp('/?q=rick&page=2');
  await screen.findByRole('article', { name: 'Rick Sanchez' });
  await user.click(screen.getByRole('button', { name: 'Clear search' }));
  expect(screen.getByRole('searchbox')).toHaveValue('');
  expect(screen.getByRole('searchbox')).toHaveFocus();
  expect(new URLSearchParams(router.state.location.search).has('q')).toBe(false);
  expect(new URLSearchParams(router.state.location.search).get('page')).toBe('1');
});

test('initial loading is announced before characters arrive', async () => {
  server.use(
    http.get(characterApiUrl, async () => {
      await delay(100);
      return HttpResponse.json(characterPage);
    }),
  );
  renderApp();
  expect(screen.getByRole('status')).toHaveTextContent('Loading characters');
  expect(screen.queryByRole('article')).not.toBeInTheDocument();
  expect(await screen.findByRole('article', { name: 'Rick Sanchez' })).toBeInTheDocument();
});

test('search and page restore from the URL and reach the API', async () => {
  let requestedSearch = '';
  let requestedPage = '';
  server.use(
    http.get(characterApiUrl, ({ request }) => {
      const params = new URL(request.url).searchParams;
      requestedSearch = params.get('name') ?? '';
      requestedPage = params.get('page') ?? '';
      return HttpResponse.json(characterPage);
    }),
  );
  renderApp('/?q=rick&page=2');
  expect(screen.getByRole('searchbox')).toHaveValue('rick');
  await screen.findByRole('article', { name: 'Rick Sanchez' });
  expect(requestedSearch).toBe('rick');
  expect(requestedPage).toBe('2');
  expect(
    screen.getByRole('navigation', { name: 'Character results pagination' }),
  ).toHaveTextContent('Page 2 of 2');
  expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
});

test('invalid page values safely fetch page one', async () => {
  let requestedPage = '';
  server.use(
    http.get(characterApiUrl, ({ request }) => {
      requestedPage = new URL(request.url).searchParams.get('page') ?? '';
      return HttpResponse.json(characterPage);
    }),
  );
  renderApp('/?page=-4');
  await screen.findByRole('article', { name: 'Rick Sanchez' });
  expect(requestedPage).toBe('1');
  expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
});

test('empty search results explain the result and can be cleared', async () => {
  const user = userEvent.setup();
  server.use(
    http.get(characterApiUrl, ({ request }) =>
      new URL(request.url).searchParams.has('name')
        ? new HttpResponse(null, { status: 404 })
        : HttpResponse.json(characterPage),
    ),
  );
  const { router } = renderApp('/?q=unfindable');
  expect(await screen.findByRole('heading', { name: 'No characters matched' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Show all characters' }));
  await screen.findByRole('article', { name: 'Rick Sanchez' });
  expect(new URLSearchParams(router.state.location.search).has('q')).toBe(false);
  expect(screen.getByRole('searchbox')).toHaveValue('');
});

test('a server error shows friendly feedback and retry can recover', async () => {
  const user = userEvent.setup();
  server.use(http.get(characterApiUrl, () => new HttpResponse(null, { status: 503 })));
  renderApp();
  expect(await screen.findByRole('alert')).toHaveTextContent('Characters are out of reach');
  server.use(http.get(characterApiUrl, () => HttpResponse.json(characterPage)));
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByRole('article', { name: 'Rick Sanchez' })).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('expected client errors are not automatically retried', async () => {
  let requests = 0;
  server.use(
    http.get(characterApiUrl, () => {
      requests += 1;
      return new HttpResponse(null, { status: 400 });
    }),
  );
  renderApp();
  await screen.findByRole('alert');
  expect(requests).toBe(1);
});

test('pagination updates the URL and retains results while the next page loads', async () => {
  const user = userEvent.setup();
  server.use(
    http.get(characterApiUrl, async ({ request }) => {
      const page = new URL(request.url).searchParams.get('page');
      if (page === '2') await delay(150);
      return HttpResponse.json({
        info: { count: 40, pages: 2 },
        results: page === '2' ? [morty] : [rick],
      });
    }),
  );
  const { router } = renderApp('/?q=rick');
  await screen.findByRole('article', { name: 'Rick Sanchez' });
  await user.click(screen.getByRole('button', { name: 'Next page' }));
  expect(new URLSearchParams(router.state.location.search).get('page')).toBe('2');
  expect(new URLSearchParams(router.state.location.search).get('q')).toBe('rick');
  expect(screen.getByRole('article', { name: 'Rick Sanchez' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Updating results');
  expect(await screen.findByRole('article', { name: 'Morty Smith' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Previous page' }));
  expect(new URLSearchParams(router.state.location.search).get('page')).toBe('1');
});

test('browser back and forward restore the input without recommitting old drafts', async () => {
  const user = userEvent.setup();
  const { router } = renderApp();
  await user.type(screen.getByRole('searchbox'), 'rick');
  await waitFor(() =>
    expect(new URLSearchParams(router.state.location.search).get('q')).toBe('rick'),
  );
  await act(async () => {
    await router.navigate(-1);
  });
  expect(screen.getByRole('searchbox')).toHaveValue('');
  await act(async () => {
    await router.navigate(1);
  });
  expect(screen.getByRole('searchbox')).toHaveValue('rick');
});

test('a failed character image renders a named fallback', async () => {
  renderApp();
  const image = await screen.findByRole('img', { name: 'Rick Sanchez portrait' });
  fireEvent.error(image);
  expect(
    screen.getByRole('img', { name: 'Portrait unavailable for Rick Sanchez' }),
  ).toBeInTheDocument();
});
