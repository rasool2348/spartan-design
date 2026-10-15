import { Routes } from '@angular/router';
import { Trend } from './trend/trend';
import { Home } from './home/home';
import { HomeV2 } from './home-v2/home-v2';
import { Overview } from './3d/overview';
import { PartPlaceholder } from './3d/part-placeholder';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    component: Home,
  },
  {
    path: 'home-v2',
    component: HomeV2,
  },
  {
    path: 'trend',
    component: Trend,
  },
  {
    path: 'overview',
    component: Overview,
  },
  {
    path: 'turret',
    component: PartPlaceholder,
    data: { title: 'Ladle Turret' },
  },
  {
    path: 'ladle/:id',
    component: PartPlaceholder,
    data: { title: 'Ladle Details' },
  },
  {
    path: 'tundish-car/:id',
    component: PartPlaceholder,
    data: { title: 'Tundish Car' },
  },
  {
    path: 'tundish/:id',
    component: PartPlaceholder,
    data: { title: 'Tundish' },
  },
  {
    path: 'strand/:id',
    component: PartPlaceholder,
    data: { title: 'Strand' },
  },
  {
    path: 'casting-line',
    component: PartPlaceholder,
    data: { title: 'Casting Line' },
  },
  {
    path: '**',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
