import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { AdminLoginRoutingModule } from './admin-login-routing.module';
import { AdminLoginPage } from './admin-login.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminLoginRoutingModule
  ],
  declarations: [AdminLoginPage]
})
export class AdminLoginPageModule {}
