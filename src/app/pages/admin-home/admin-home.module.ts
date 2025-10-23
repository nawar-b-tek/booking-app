import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminHomePage } from './admin-home.page';
import { IonicModule } from '@ionic/angular';

const routes: Routes = [
  {
    path: '',
    component: AdminHomePage, 
  },
  { path: 'users',         loadChildren: () => import('../../admin/admin-users/admin-users.module').then(m => m.AdminUsersPageModule) },
];

@NgModule({
  imports: [RouterModule.forChild(routes),IonicModule,],
})
export class AdminHomePageModule {}
