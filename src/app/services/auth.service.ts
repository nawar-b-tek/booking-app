import { Injectable } from '@angular/core';
import {
  Auth,
  User,
  authState,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile
} from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail as firebaseUpdateEmail,
  updatePassword as firebaseUpdatePassword
} from 'firebase/auth';
import { BehaviorSubject, Observable, from, of, firstValueFrom } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export type AppRole = 'user' | 'owner' | 'admin' | null; // adapte selon besoins

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  public authState$: Observable<User | null>;
  private roleSubject = new BehaviorSubject<AppRole>(null);
  public role$ = this.roleSubject.asObservable();
  private currentUser: User | null = null;

  constructor(private auth: Auth, private firestore: Firestore) {
    this.authState$ = authState(this.auth);

    this.authState$.subscribe((u) => this.currentUser = u);

    this.authState$.pipe(
      switchMap((user: User | null) => {
        if (!user) {
          this.roleSubject.next(null);
          return of(null);
        }
        return from(this.getRole(user.uid));
      })
    ).subscribe((role) => {
      this.roleSubject.next(role);
    }, (err) => {
      console.error('Erreur lors de la récupération du rôle :', err);
      this.roleSubject.next(null);
    });
  }

  public async register(
    email: string,
    password: string,
    role: Exclude<AppRole, null> = 'user',
    metadata?: { displayName?: string; phone?: string }
  ): Promise<User> {
    const credential = await createUserWithEmailAndPassword(this.auth, email, password);
    const user = credential.user;
    if (!user) throw new Error('User creation failed');

    const docRef = doc(this.firestore, `users/${user.uid}`);
    const payload: Record<string, unknown> = {
      email,
      role,
      createdAt: new Date().toISOString()
    };
  if (metadata?.displayName) payload['displayName'] = metadata.displayName;
  if (metadata?.phone) payload['phone'] = metadata.phone;

    await setDoc(docRef, payload);
    this.roleSubject.next(role);
    return user;
  }

  public async login(email: string, password: string): Promise<User> {
    const credential = await signInWithEmailAndPassword(this.auth, email, password);
    const user = credential.user;
    if (!user) {
      throw new Error('Connexion utilisateur échouée');
    }
    return user;
  }

  public async logout(): Promise<void> {
    this.roleSubject.next(null);
    await signOut(this.auth);
  }

  public async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(this.auth, email);
  }

  public async updateProfileDisplayName(displayName: string, photoURL?: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Aucun utilisateur connecté');
    await updateProfile(user, { displayName, photoURL });
  }

  public getCurrentUserSnapshot(): User | null {
    return this.currentUser;
  }

  public async reauthenticate(currentPassword: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user || !user.email) {
      throw new Error('Impossible de vérifier l’utilisateur actuel.');
    }
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
  }

  public async updateEmailAddress(newEmail: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Aucun utilisateur connecté');
    await firebaseUpdateEmail(user, newEmail);
  }

  public async updateUserPassword(newPassword: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Aucun utilisateur connecté');
    await firebaseUpdatePassword(user, newPassword);
  }

  public async getRole(uid: string): Promise<AppRole> {
    try {
      const snapshot = await getDoc(doc(this.firestore, `users/${uid}`));
      if (!snapshot.exists()) return null;
      const data = snapshot.data() as any;
      return (data.role ?? null) as AppRole;
    } catch (err) {
      console.error('getRole error', err);
      return null;
    }
  }

  public async getUserProfileData(uid: string): Promise<Record<string, unknown> | null> {
    const snapshot = await getDoc(doc(this.firestore, `users/${uid}`));
    return snapshot.exists() ? snapshot.data() ?? null : null;
  }

  public async updateUserProfileDoc(uid: string, data: Record<string, unknown>): Promise<void> {
    const docRef = doc(this.firestore, `users/${uid}`);
    await setDoc(docRef, data, { merge: true });
  }

  public async refreshRoleFromServer(): Promise<void> {
    const user = this.currentUser;
    if (!user) {
      this.roleSubject.next(null);
      return;
    }
    const role = await this.getRole(user.uid);
    this.roleSubject.next(role);
  }

  public isOwner(): boolean {
    return this.roleSubject.value === 'owner';
  }

  public isUser(): boolean {
    return this.roleSubject.value === 'user';
  }
}
