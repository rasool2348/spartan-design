import { Routes } from '@angular/router';
import { App } from './app';
import { Trend } from './trend/trend';
import { Home } from './home/home';

export const routes: Routes = [
  {
    path: '',
    redirectTo:'home',
    pathMatch:'full',
  },
  {
    path: 'home',
    component: Home,
  },
  {
    path: 'trend',
    component: Trend,
  },
  {
    path: '**',
    redirectTo:'home',
    pathMatch:'full',
  }
];
