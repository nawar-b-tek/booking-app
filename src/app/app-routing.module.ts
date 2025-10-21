import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'register',
    loadChildren: () => import('./pages/register/register.module').then( m => m.RegisterPageModule)
  },
  {
    path: '', redirectTo: 'login', pathMatch: 'full'
  },
  {
    path: 'login', loadChildren: () => import('./pages/login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'register', loadChildren: () => import('./pages/register/register.module').then(m => m.RegisterPageModule)
  },

  // pages protégées (exemples)
  {
    path: 'user/home', loadChildren: () => import('./pages/user/home/home.module').then(m => m.HomePageModule)
  },
  {
    path: 'owner/home', loadChildren: () => import('./pages/owner/home/home.module').then(m => m.HomePageModule)
  },

];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
