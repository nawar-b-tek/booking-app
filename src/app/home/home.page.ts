import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import {
  BehaviorSubject,
  Observable,
  catchError,
  combineLatest,
  map,
  of
} from 'rxjs';

// Interface complète qui correspond à votre structure Firebase
interface Annonce {
  id?: string;
  
  // Informations principales
  title?: string;
  description?: string;
  currency?: string;
  
  // Prix
  price?: number;
  price_per_day?: number;
  price_per_month?: number;
  
  // Photos
  photos?: string[];
  
  // Adresse (objet imbriqué)
  address?: {
    street?: string;
    city?: string;
    postal_code?: string;
    country?: string;
  };
  
  // Contact (objet imbriqué)
  contact?: {
    phone?: string;
    email?: string;
  };
  
  // Localisation (objet imbriqué)
  location?: {
    latitude?: number;
    longitude?: number;
  };
  
  // Caractéristiques
  bedrooms?: number;
  bathrooms?: number;
  
  // Réservation
  isBooked?: boolean;
  id_booked_user?: string;
  
  // Propriétaire
  userId?: string;
  posterId?: string;
  ownerEmail?: string;
  user_id?: string;
  
  // Timestamps
  createdAt?: any;
  updatedAt?: any;
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

  filters: { destination: string; rooms: number | string | null } = {
    destination: '',
    rooms: ''
  };

  private readonly filtersSubject = new BehaviorSubject<{ destination: string; rooms: number | null }>({
    destination: '',
    rooms: null,
  });

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

  readonly filteredAnnonces$ = combineLatest([this.annonces$, this.filtersSubject]).pipe(
    map(([annonces, filters]) => this.applyAnnonceFilters(annonces, filters))
  );

  applyFilters(): void {
    const destination = (this.filters.destination ?? '').trim();
    const rawRooms = this.filters.rooms;

    let roomsNumber: number | null = null;
    if (typeof rawRooms === 'string') {
      const parsed = parseInt(rawRooms, 10);
      roomsNumber = Number.isFinite(parsed) ? parsed : null;
    } else if (typeof rawRooms === 'number') {
      roomsNumber = Number.isFinite(rawRooms) ? rawRooms : null;
    }

    const rooms = roomsNumber !== null && roomsNumber > 0 ? roomsNumber : null;

    this.filters.destination = destination;
    this.filters.rooms = rooms ?? '';

    this.filtersSubject.next({
      destination,
      rooms,
    });
  }

  private applyAnnonceFilters(
    annonces: Annonce[],
    filters: { destination: string; rooms: number | null }
  ): Annonce[] {
    const destinationNeedle = filters.destination.toLowerCase();
    const roomsMinimum = filters.rooms ?? null;

    if (!destinationNeedle && roomsMinimum === null) {
      return annonces;
    }

    return annonces.filter((annonce) => {
      const matchesDestination =
        !destinationNeedle ||
        [
          annonce.title,
          annonce.description,
          annonce.address?.city,
          annonce.address?.country,
          annonce.address?.street,
        ]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(destinationNeedle));

      const availableRooms =
        typeof annonce.bedrooms === 'number'
          ? annonce.bedrooms
          : typeof (annonce as any)?.rooms === 'number'
            ? (annonce as any).rooms
            : null;
      const matchesRooms = roomsMinimum === null || (availableRooms ?? 0) >= roomsMinimum;

      return matchesDestination && matchesRooms;
    });
  }
}
