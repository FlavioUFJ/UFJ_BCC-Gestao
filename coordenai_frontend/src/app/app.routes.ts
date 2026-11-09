import { Routes } from '@angular/router';

import { administradorGuard, autenticadoGuard, visitanteGuard } from './core/guards';

const TITULO = 'CoordenAI';

export const routes: Routes = [
  // A ordem importa: grupos com caminho vazio são testados em sequência, e o
  // de "página não encontrada" precisa ser o último.
  {
    path: '',
    canActivate: [autenticadoGuard],
    loadComponent: () => import('./layout/casca').then((m) => m.Casca),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: `Módulos · ${TITULO}`,
        loadComponent: () => import('./features/modulos/modulos').then((m) => m.Modulos),
      },
      {
        path: 'alterar-senha',
        title: `Alterar senha · ${TITULO}`,
        loadComponent: () => import('./features/auth/alterar-senha').then((m) => m.AlterarSenha),
      },
      {
        path: 'admin/modulos',
        title: `Módulos do sistema · ${TITULO}`,
        canActivate: [administradorGuard],
        loadComponent: () => import('./features/admin/modulos-sistema').then((m) => m.ModulosSistema),
      },
    ],
  },
  {
    path: '',
    loadComponent: () => import('./layout/casca-visitante').then((m) => m.CascaVisitante),
    children: [
      {
        path: 'login',
        title: `Entrar · ${TITULO}`,
        canActivate: [visitanteGuard],
        loadComponent: () => import('./features/auth/login').then((m) => m.Login),
      },
      {
        path: 'recuperar-senha',
        title: `Recuperar senha · ${TITULO}`,
        canActivate: [visitanteGuard],
        loadComponent: () => import('./features/auth/recuperar-senha').then((m) => m.RecuperarSenha),
      },
      {
        path: 'redefinir-senha/:token',
        title: `Redefinir senha · ${TITULO}`,
        loadComponent: () => import('./features/auth/redefinir-senha').then((m) => m.RedefinirSenha),
      },
    ],
  },
  {
    path: '',
    canActivate: [autenticadoGuard],
    loadComponent: () => import('./layout/casca').then((m) => m.Casca),
    children: [
      {
        path: '**',
        title: `Página não encontrada · ${TITULO}`,
        loadComponent: () => import('./features/nao-encontrada').then((m) => m.NaoEncontrada),
      },
    ],
  },
];
