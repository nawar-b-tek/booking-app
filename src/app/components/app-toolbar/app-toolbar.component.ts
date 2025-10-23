import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Router } from '@angular/router';
import { Observable, combineLatest, map } from 'rxjs';
import { AuthService, AppRole } from '../../services/auth.service';

type ToolbarRole = Exclude<AppRole, null>;

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  templateUrl: './app-toolbar.html',
  styleUrls: ['./app-toolbar.component.css']
})
export class AppToolbarComponent {
  user$: Observable<{
    name: string;
    email: string;
    role: ToolbarRole;
    hasNotifications: boolean;
  } | null>;

  constructor(private auth: AuthService, private router: Router) {
    this.user$ = combineLatest([this.auth.authState$, this.auth.role$]).pipe(
      map(([fbUser, role]) => {
        if (!fbUser) {
          return null;
        }

        return {
          name: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'User'),
          email: fbUser.email || '',
          role: (role ?? 'user') as ToolbarRole,
          hasNotifications: false
        };
      })
    );
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(['/']);
  }

  goToNotifications(): void {
    this.router.navigate(['/notifications']);
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }
}
