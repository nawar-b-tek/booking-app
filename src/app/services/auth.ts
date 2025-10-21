import { Injectable } from '@angular/core';
import { Auth, User, authState, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile } from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc, updateDoc } from '@angular/fire/firestore';
import { BehaviorSubject, from, Observable } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

export type AppRole = 'user' | 'owner' | 'admin' | null; // adapte selon besoins

@Injectable({
  providedIn: 'root' // singleton global
})
export class AuthService {
  /**
   * authState$ : Observable qui émet l'objet User Firebase (ou null) à chaque changement d'état.
   * Utile pour afficher UI conditionnelle (ex: menu connecté/déconnecté).
   */
  public authState$: Observable<User | null>;

  /**
   * role$ : BehaviorSubject local pour garder le role courant en mémoire et
   * le partager facilement entre composants (optionnel mais pratique).
   */
  private roleSubject = new BehaviorSubject<AppRole>(null);
  public role$ = this.roleSubject.asObservable();

  constructor(private auth: Auth, private firestore: Firestore) {
    // on expose l'observable d'auth fournie par AngularFire
    this.authState$ = authState(this.auth);

    // à chaque changement d'auth, on charge le rôle depuis Firestore (si connecté)
    this.authState$.pipe(
      switchMap(user => {
        if (!user) {
          // si déconnecté, remettre role à null
          this.roleSubject.next(null);
          return from([null]);
        }
        // si connecté, récupérer le role depuis la collection users/{uid}
        return from(this.getRole(user.uid));
      })
    ).subscribe((role) => {
      // met à jour le BehaviorSubject (null | 'user' | 'owner' ...)
      this.roleSubject.next(role);
    }, (err) => {
      console.error('Erreur lors de la récupération du rôle :', err);
      this.roleSubject.next(null);
    });
  }

  // ---------- AUTH ACTIONS ----------

  /**
   * register
   * - Crée l'utilisateur dans Firebase Auth
   * - Crée un document users/{uid} dans Firestore pour stocker le role et autres métadonnées
   *
   * @param email string
   * @param password string
   * @param role 'user' | 'owner' | 'admin' (adapter selon besoin)
   * @returns Promise<User> l'objet user Firebase
   * @throws erreur Firebase si création echoue
   */
  public async register(email: string, password: string, role: Exclude<AppRole, null> = 'user'): Promise<User> {
    // createUserWithEmailAndPassword renvoie un UserCredential; on récupère .user
    const credential = await createUserWithEmailAndPassword(this.auth, email, password);
    const user = credential.user;

    // Stocker les informations supplémentaires dans Firestore
    const userDocRef = doc(this.firestore, `users/${user.uid}`);
    await setDoc(userDocRef, {
      email: email,
      role: role,
      createdAt: new Date().toISOString()
      // ajouter d'autres champs utiles (displayName, phone, etc.) si nécessaire
    });

    // mettre à jour le BehaviorSubject role local (pratique pour UI immédiate)
    this.roleSubject.next(role);

    return user;
  }

  /**
   * login
   * - Connecte l'utilisateur via email/password
   *
   * @param email string
   * @param password string
   * @returns Promise<User>
   */
  public async login(email: string, password: string): Promise<User> {
    const credential = await signInWithEmailAndPassword(this.auth, email, password);
    return credential.user;
  }

  /**
   * logout : déconnecte l'utilisateur
   */
  public async logout(): Promise<void> {
    // clear local role (optionnel)
    this.roleSubject.next(null);
    await signOut(this.auth);
  }

  /**
   * sendPasswordReset
   * - envoie un email de réinitialisation via Firebase Auth
   *
   * @param email string
   */
  public async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(this.auth, email);
  }

  /**
   * updateProfileDisplayName
   * - met à jour le displayName (et éventuellement la photoURL)
   * - utilise updateProfile de Firebase Auth
   */
  public async updateProfileDisplayName(displayName: string, photoURL?: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Aucun utilisateur connecté');

    await updateProfile(user, { displayName, photoURL });
  }

  // ---------- ROLE / USER INFO ----------

  /**
   * getCurrentUserSnapshot
   * - renvoie l'utilisateur courant (synchrone) si connecté, sinon null
   */
  public getCurrentUserSnapshot(): User | null {
    return this.auth.currentUser;
  }

  /**
   * getRole
   * - lit le document users/{uid} dans Firestore et renvoie le champ 'role'
   * - si pas de doc -> null
   *
   * @param uid string
   * @returns Promise<AppRole>
   */
  public async getRole(uid: string): Promise<AppRole> {
    try {
      const snap = await getDoc(doc(this.firestore, `users/${uid}`));
      if (!snap.exists()) return null;
      const data = snap.data() as any;
      return (data.role ?? null) as AppRole;
    } catch (err) {
      console.error('getRole error', err);
      return null;
    }
  }

  /**
   * refreshRoleFromServer
   * - utile si vous modifiez le rôle coté admin et voulez forcer la maj locale
   */
  public async refreshRoleFromServer(): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) {
      this.roleSubject.next(null);
      return;
    }
    const role = await this.getRole(user.uid);
    this.roleSubject.next(role);
  }

  // helpers pratiques
  public isOwner(): boolean {
    return this.roleSubject.value === 'owner';
  }
  public isUser(): boolean {
    return this.roleSubject.value === 'user';
  }
}
