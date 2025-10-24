import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { Observable, catchError, map, of } from 'rxjs';

// Complete interface matching Firebase structure
interface Annonce {
  id?: string;
  
  // Main information
  title?: string;
  description?: string;
  currency?: string;
  
  // Pricing
  price?: number;
  price_per_day?: number;
  price_per_month?: number;
  
  // Photos
  photos?: string[];
  
  // Address (nested object)
  address?: {
    street?: string;
    city?: string;
    postal_code?: string;
    country?: string;
  };
  
  // Contact (nested object)
  contact?: {
    phone?: string;
    email?: string;
  };
  
  // Location (nested object)
  location?: {
    latitude?: number;
    longitude?: number;
  };
  
  // Features
  bedrooms?: number;
  bathrooms?: number;
  
  // Booking
  isBooked?: boolean;
  id_booked_user?: string;
  
  // Owner
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

  
  readonly annonces$: Observable<Annonce[]> = collectionData(
    collection(this.firestore, 'annonces'),
    { idField: 'id' }
  ).pipe(
    map((docs) => docs as Annonce[]),
    catchError((err) => {
      console.error('Failed to load announcements', err);
      this.errorMessage = 'Unable to load announcements right now.';
      return of([]);
    })
  );
}