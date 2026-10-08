import { Routes } from '@angular/router';
import { App } from './app';
import { Trend } from './trend/trend';

export const routes: Routes = [
  {
    path: '',
    component: App,
  },
  {
    path: 'trend',
    component: Trend,
  }
];
