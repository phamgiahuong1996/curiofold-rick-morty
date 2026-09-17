import { createBrowserRouter } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';

import { CollectionsPage } from '../pages/CollectionsPage/CollectionsPage';
import { ExplorePage } from '../pages/ExplorePage/ExplorePage';
import { NotFoundPage } from '../pages/NotFoundPage/NotFoundPage';
import { AppShell } from '../shared/components/AppShell/AppShell';
import { CollectionStorageFeedback } from '../features/collections';

export const appRoutes: RouteObject[] = [
  {
    element: <AppShell feedback={<CollectionStorageFeedback />} />,
    children: [
      { index: true, element: <ExplorePage /> },
      { path: 'collections', element: <CollectionsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(appRoutes);
}
