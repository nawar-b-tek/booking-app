import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
})
export class RegisterPage {
  email = '';
  password = '';
  role: 'user' | 'owner' = 'user';
  loading = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private toastCtrl: ToastController
  ) {}

  async onRegister() {
    this.loading = true;
    try {
      const user = await this.auth.register(this.email, this.password, this.role);
      const toast = await this.toastCtrl.create({
        message: 'Inscription réussie',
        duration: 1500
      });
      toast.present();

      // Redirection selon rôle
      if (this.role === 'owner') this.router.navigateByUrl('/owner/home');
      else this.router.navigateByUrl('/user/home');
    } catch (err: any) {
      const toast = await this.toastCtrl.create({
        message: err.message || 'Erreur lors de l\'inscription',
        duration: 3000
      });
      toast.present();
      console.error('register error', err);
    } finally {
      this.loading = false;
    }
  }
}
