// src/app/admin/admin-users/admin-users-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminUsersPage } from './admin-users.page';

const routes: Routes = [
  { path: '', component: AdminUsersPage },
  //{ path: 'add', loadChildren: () => import('./admin-users-add/admin-users-add.module').then(m => m.AdminUsersAddPageModule) },
  //{ path: 'edit/:id', loadChildren: () => import('./admin-users-edit/admin-users-edit.module').then(m => m.AdminUsersEditPageModule) }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminUsersPageRoutingModule {}
