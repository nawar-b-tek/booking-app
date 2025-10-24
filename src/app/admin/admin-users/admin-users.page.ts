import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController } from '@ionic/angular';
import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  doc,
  deleteDoc
} from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.page.html',
  styleUrls: ['./admin-users.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
})
export class AdminUsersPage implements OnInit {
  users$!: Observable<any[]>;

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
        { name: 'phone', type: 'text', placeholder: 'Téléphone' },
        { name: 'role', type: 'text', placeholder: 'Rôle (user ou admin)' },
      ],
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Ajouter',
          handler: async (data: any) => {
            if (!data.name || !data.email) {
              return;
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
              await addDoc(collection(this.firestore, 'users'), user);
              console.log('Use added');
              this.loadUsers();
            } catch (err) {
              console.error('Error:', err);
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
    alert('Utilisateur supprimé');
    this.loadUsers();
  }

  reloadUsers(event: any) {
    this.loadUsers();
    event.target.complete();
  }
}
