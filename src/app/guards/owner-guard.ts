import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { authState } from '@angular/fire/auth';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class OwnerGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private auth: Auth,
    private router: Router
  ) {}

  /**
   * - attend l'état d'auth (authState) pour s'assurer que l'info user est stable
   * - si pas connecté -> redirige vers /login?returnUrl=<urlDemandee>
   * - si connecté -> récupère le role depuis Firestore (authService.getRole)
   * - autorise seulement si role === 'owner'
   */
  async canActivate(): Promise<boolean | UrlTree> {
    try {
      // 1) attendre le premier état d'auth (user ou null)
      const user = await firstValueFrom(authState(this.auth));
      if (!user) {
        // pas connecté -> rediriger vers login en conservant la route demandée
        return this.router.createUrlTree(['/login'], { queryParams: { returnUrl: this.router.url }});
      }

      // 2) récupérer le rôle depuis Firestore
      const role = await this.authService.getRole(user.uid);

      // 3) si owner -> ok
      if (role === 'owner') return true;

      // sinon -> accès refusé (page not-authorized)
      return this.router.createUrlTree(['/not-authorized']);
    } catch (err) {
      console.error('OwnerGuard error', err);
      // en cas d'erreur sécurisée, renvoyer vers login
      return this.router.createUrlTree(['/login']);
    }
  }
}
