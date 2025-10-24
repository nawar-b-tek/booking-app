import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Router } from '@angular/router';
import { Observable, combineLatest, map, of, switchMap } from 'rxjs';
import { AuthService, AppRole } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

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

  constructor(
    private auth: AuthService,
    private router: Router,
    private notifications: NotificationService
  ) {
    this.user$ = combineLatest([this.auth.authState$, this.auth.role$]).pipe(
      switchMap(([fbUser, role]) => {
        if (!fbUser) {
          return of(null);
        }

        const email = fbUser.email || '';
        return this.notifications.observeUnreadCount(email).pipe(
          map((count) => ({
            name: fbUser.displayName || (email ? email.split('@')[0] : 'User'),
            email,
            role: (role ?? 'user') as ToolbarRole,
            hasNotifications: count > 0,
          }))
        );
      })
    );
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(['/']);
  }

  async goToNotifications(): Promise<void> {
    const current = this.auth.getCurrentUserSnapshot();
    if (current?.email) {
      await this.notifications.markAllAsRead(current.email);
    }
    this.router.navigate(['/reservations']);
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }
}
