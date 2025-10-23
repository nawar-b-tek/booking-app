import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { Observable, catchError, map, of } from 'rxjs';

interface Annonce {
  id: string;
  title?: string;
  description?: string;
  price?: number;
  photos?: string[];
}

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule],
})
export class HomePage {
  private readonly firestore = inject(Firestore);

  errorMessage = '';

  readonly annonces$: Observable<Annonce[]> = collectionData(
    collection(this.firestore, 'annonces'),
    { idField: 'id' }
  ).pipe(
    map((docs) => docs as Annonce[]),
    catchError((err) => {
      console.error('Failed to load annonces', err);
      this.errorMessage = 'Unable to load announcements right now.';
      return of([]);
    })
  );
}

