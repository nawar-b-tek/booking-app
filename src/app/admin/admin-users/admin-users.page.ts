import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Firestore, collection, collectionData, doc, deleteDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.page.html',
  styleUrls: ['./admin-users.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule] // <-- IMPORTANT : fournit NgFor/NgIf + ion-*
})
export class AdminUsersPage implements OnInit {
  users$!: Observable<any[]>; // '!' pour éviter l'erreur TS strict

  constructor(private firestore: Firestore, private router: Router) {}

  ngOnInit() {
    const usersRef = collection(this.firestore, 'users');
    this.users$ = collectionData(usersRef, { idField: 'id' }).pipe(
      map((arr: any[]) => arr.map(u => ({
        ...u,
        createdAtStr: u?.createdAt ? new Date(u.createdAt).toLocaleString() : '—'
      })))
    );
  }

  addUser() { this.router.navigate(['/admin/add-user']); }
  editUser(u: any) { this.router.navigate(['/admin/edit-user', u.id]); }

  async deleteUser(id: string) {
    if (!confirm('Voulez-vous vraiment supprimer cet utilisateur ?')) return;
    await deleteDoc(doc(this.firestore, `users/${id}`));
  }
}
