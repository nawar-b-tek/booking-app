import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-admin-login',
  templateUrl: './admin-login.page.html',
  standalone: false,
  styleUrls: ['./admin-login.page.scss'],
})
export class AdminLoginPage {
  email = '';
  password = '';
  loading = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private toastCtrl: ToastController
  ) {}

  async onLogin() {
    this.loading = true;
    try {
      const user = await this.auth.login(this.email, this.password);
      const role = await this.auth.getRole(user.uid);
      if (role === 'admin') {
        this.router.navigateByUrl('/admin/home');
      } else {
        const t = await this.toastCtrl.create({ message: 'Accès administrateur refusé', duration: 2000 });
        await t.present();
      }
    } catch (err: any) {
      const t = await this.toastCtrl.create({ message: err?.message || 'Erreur', duration: 2500 });
      await t.present();
    } finally {
      this.loading = false;
    }
  }
}
