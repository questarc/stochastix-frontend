import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'MarketWatch | Stochastix AI',
    loadComponent: () =>
      import('./features/market/market-dashboard.component').then((m) => m.MarketDashboardComponent),
  },
  {
    path: 'quant-models',
    title: 'Quant Models | Stochastix AI',
    loadComponent: () =>
      import('./features/quant-models/quant-models-page.component').then((m) => m.QuantModelsPageComponent),
  },
  { path: '**', redirectTo: '' },
];
