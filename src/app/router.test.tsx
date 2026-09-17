import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';

import { renderApp } from '../test/render';

test('the default route renders Explore inside the main landmark', () => {
  renderApp();
  expect(
    within(screen.getByRole('main')).getByRole('heading', { level: 1, name: 'Explore' }),
  ).toBeInTheDocument();
});

test('primary navigation reaches Collections and updates active state and focus', async () => {
  const user = userEvent.setup();
  renderApp();
  const nav = screen.getByRole('navigation', { name: 'Primary' });
  await user.click(within(nav).getByRole('link', { name: 'Collections' }));
  expect(screen.getByRole('heading', { level: 1, name: 'Collections' })).toBeInTheDocument();
  expect(within(nav).getByRole('link', { name: 'Collections' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  expect(within(nav).getByRole('link', { name: 'Explore' })).not.toHaveAttribute('aria-current');
  expect(screen.getByRole('main')).toHaveFocus();
});

test('an unknown route renders a not-found page with a working return link', async () => {
  const user = userEvent.setup();
  renderApp('/unknown');
  expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: 'Back to Explore' }));
  expect(screen.getByRole('heading', { level: 1, name: 'Explore' })).toBeInTheDocument();
});

test('the shell exposes named primary links and a skip link to focusable main content', () => {
  renderApp();
  const nav = screen.getByRole('navigation', { name: 'Primary' });
  expect(within(nav).getAllByRole('link')).toHaveLength(2);
  expect(within(nav).getByRole('link', { name: 'Explore' })).toHaveAttribute('href', '/');
  expect(within(nav).getByRole('link', { name: 'Explore' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  expect(within(nav).getByRole('link', { name: 'Collections' })).toHaveAttribute(
    'href',
    '/collections',
  );
  expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute(
    'href',
    '#main-content',
  );
  expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  expect(screen.getByRole('main')).toHaveAttribute('tabindex', '-1');
});
