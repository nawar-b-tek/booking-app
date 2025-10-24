// src/app/admin/admin-users/admin-users.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

import { AdminUsersPage } from './admin-users.page'; // composant standalone
import { AdminUsersPageRoutingModule } from './admin-users-routing.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminUsersPageRoutingModule,
    AdminUsersPage   
  ],
})
export class AdminUsersPageModule {}