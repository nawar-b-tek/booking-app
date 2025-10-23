import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  // autres routes existantes (home, login, register, etc.)
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then(m => m.HomePageModule)
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'register',
    loadChildren: () => import('./pages/register/register.module').then(m => m.RegisterPageModule)
  },

  // --- ADMIN area: home et admin-users en tant qu'entrées absolues
  {
    path: 'admin',
    children: [
      {
        path: 'home',
        loadChildren: () => import('./pages/admin-home/admin-home.module').then(m => m.AdminHomePageModule)
      },
      {
        path: 'admin-users',
        loadChildren: () => import('./admin/admin-users/admin-users.module').then(m => m.AdminUsersPageModule)
      }
    ]
  },
  {
    path: 'account',
    canActivate: [AuthGuard],
    loadChildren: () => import('./pages/user-account/user-account.module').then(m => m.UserAccountPageModule)
  },
  {
    path: 'admin/home', loadChildren: () => import('./pages/admin-home/admin-home.module').then(m => m.AdminHomePageModule)
  },
  {
    path: 'admin-login', loadChildren: () => import('./pages/admin-login/admin-login.module').then(m => m.AdminLoginPageModule)
  },

  // fallback / redirect
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
