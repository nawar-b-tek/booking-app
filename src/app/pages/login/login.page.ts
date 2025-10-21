import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html'
})
export class LoginPage {
  email = '';
  password = '';
  loading = false;
  private returnUrl: string | null = null;

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toastCtrl: ToastController
  ) {
    // lire le returnUrl depuis la queryParams si présent
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
  }

  async onLogin() {
    this.loading = true;
    try {
      const user = await this.auth.login(this.email, this.password);

      // forcer la lecture du rôle le cas échéant
      await this.auth.refreshRoleFromServer();
      const role = await this.auth.getRole(user.uid);

      // Si returnUrl fourni -> rediriger vers returnUrl
      if (this.returnUrl) {
        this.router.navigateByUrl(this.returnUrl);
      } else {
        // sinon redirection par défaut selon role
        if (role === 'owner') this.router.navigateByUrl('/owner/home');
        else this.router.navigateByUrl('/user/home');
      }

      const toast = await this.toastCtrl.create({ message: 'Connexion réussie', duration: 1200 });
      toast.present();
    } catch (err: any) {
      const toast = await this.toastCtrl.create({ message: err.message || 'Erreur de connexion', duration: 3000 });
      toast.present();
      console.error('login error', err);
    } finally {
      this.loading = false;
    }
  }
}
