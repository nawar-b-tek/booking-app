import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController } from '@ionic/angular';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  setDoc,
  deleteDoc
} from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.page.html',
  styleUrls: ['./admin-users.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
})
export class AdminUsersPage implements OnInit {
  users$!: Observable<any[]>;
  private readonly signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${environment.firebase.apiKey}`;

  constructor(
    private firestore: Firestore,
    private alertCtrl: AlertController,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    const usersRef = collection(this.firestore, 'users');
    this.users$ = collectionData(usersRef, { idField: 'id' }).pipe(
      map((arr: any[]) =>
        arr.map(u => ({
          ...u,
          createdAtStr: u?.createdAt
            ? new Date(u.createdAt.seconds
              ? u.createdAt.seconds * 1000
              : u.createdAt
            ).toLocaleString()
            : '—',
        }))
      )
    );
  }

  async addUser() {
    const alert = await this.alertCtrl.create({
      header: 'Ajouter un utilisateur',
      inputs: [
        { name: 'name', type: 'text', placeholder: 'Nom' },
        { name: 'email', type: 'email', placeholder: 'Email' },
        { name: 'password', type: 'password', placeholder: 'Mot de passe' },
        { name: 'phone', type: 'text', placeholder: 'Téléphone' },
        { name: 'role', type: 'text', placeholder: 'Rôle (user ou admin)' },
      ],
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Ajouter',
          handler: async (data: any) => {
            if (!data.name || !data.email || !data.password) {
              window.alert('Veuillez saisir un nom, un email et un mot de passe.');
              return false;
            }

            if (data.password.length < 6) {
              window.alert('Le mot de passe doit contenir au moins 6 caractères.');
              return false;
            }

            const user = {
              displayName: data.name,
              email: data.email,
              phone: data.phone || '',
              role: data.role || 'user',
              createdAt: new Date(),
              createdAtStr: new Date().toLocaleString(),
            };

            try {
              const uid = await this.createAuthAccount(user.email, data.password, user.displayName);
              await setDoc(doc(this.firestore, `users/${uid}`), user);
              console.log('Utilisateur ajouté');
              this.loadUsers();
              return true;
            } catch (err) {
              console.error('Error:', err);
              window.alert(`Erreur lors de la création de l'utilisateur: ${(err as Error)?.message ?? err}`);
              return false;
            }
          },
        },
      ],
    });

    await alert.present();
  }

  editUser(u: any) {
    this.router.navigate(['/admin/edit-user', u.id]);
  }

  async deleteUser(id: string) {
    if (!confirm('Voulez-vous vraiment supprimer cet utilisateur ?')) return;
    await deleteDoc(doc(this.firestore, `users/${id}`));
    window.alert('Utilisateur supprimé');
    this.loadUsers();
  }

  reloadUsers(event: any) {
    this.loadUsers();
    event.target.complete();
  }

  private async createAuthAccount(email: string, password: string, displayName?: string): Promise<string> {
    const body: Record<string, unknown> = {
      email,
      password,
      returnSecureToken: false,
    };

    if (displayName) {
      body['displayName'] = displayName;
    }

    const response = await fetch(this.signUpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const json = await response.json();
    if (!response.ok) {
      const message = json?.error?.message ? String(json.error.message) : 'Impossible de créer le compte utilisateur.';
      throw new Error(message);
    }

    const localId = json?.localId;
    if (!localId) {
      throw new Error('Identifiant utilisateur introuvable dans la réponse Firebase.');
    }

    return localId as string;
  }
}
