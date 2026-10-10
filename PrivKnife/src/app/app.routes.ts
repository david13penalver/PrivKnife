import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/showcase/showcase').then((m) => m.Showcase),
  },
];
