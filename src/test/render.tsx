import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach } from 'vitest';

import { appRoutes } from '../app/router';

const resources: Array<{ client: QueryClient; router: ReturnType<typeof createMemoryRouter> }> = [];

afterEach(() => {
  for (const { client, router } of resources) {
    router.dispose();
    client.clear();
  }
  resources.length = 0;
});

export function renderApp(initialEntry = '/') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0, gcTime: 0 } },
  });
  const router = createMemoryRouter(appRoutes, { initialEntries: [initialEntry] });
  resources.push({ client, router });
  const result = render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...result, client, router };
}
