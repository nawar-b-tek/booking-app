import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Router } from '@angular/router';
import { Observable, combineLatest, map } from 'rxjs';
import { AuthService, AppRole } from '../../services/auth.service';
import type { User as FirebaseUser } from '@angular/fire/auth';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  templateUrl: './app-toolbar.html',
  styleUrls: ['./app-toolbar.component.css']
})
export class AppToolbarComponent {
  // Observable unique combinant utilisateur Firebase + rôle
  user$: Observable<{
    name: string;
    email: string;
    role: AppRole;
    hasNotifications: boolean;
  } | null>;

  constructor(private auth: AuthService, private router: Router) {
    this.user$ = combineLatest([this.auth.authState$, this.auth.role$]).pipe(
      map(([fbUser, role]) => {
        if (!fbUser) return null;
        return {
          name: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Utilisateur'),
          email: fbUser.email || '',
          role: role,
          hasNotifications: false // tu pourras relier à Firestore plus tard
        };
      })
    );
  }

  async logout() {
    await this.auth.logout();
    await this.router.navigate(['/']);
  }

  goToNotifications() {
    this.router.navigate(['/notifications']);
  }
  goHome() {
  this.router.navigate(['/home']); 
}

}
