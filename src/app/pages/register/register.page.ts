import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false
})
export class RegisterPage implements OnInit {
  email = '';
  password = '';
  // register page only for normal users
  role: 'user' = 'user';
  displayName = '';
  phone = '';
  loading = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {}

  async onRegister() {
    this.loading = true;
    try {
      const user = await this.auth.register(this.email, this.password, this.role, {
        displayName: this.displayName,
        phone: this.phone
      });
      const toast = await this.toastCtrl.create({
        message: 'Inscription réussie',
        duration: 1500
      });
      await toast.present();

  // always regular user redirect
  this.router.navigateByUrl('/user/home');
    } catch (err: any) {
      const toast = await this.toastCtrl.create({
        message: err?.message || 'Erreur lors de l\'inscription',
        duration: 3000
      });
      await toast.present();
      console.error('register error', err);
    } finally {
      this.loading = false;
    }
  }
}
