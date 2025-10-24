import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { Firestore, collection, collectionData, doc, updateDoc, serverTimestamp, addDoc, query, where } from '@angular/fire/firestore';
import { Observable, Subscription, map } from 'rxjs';
import { ToastController, AlertController } from '@ionic/angular';

type Reservation = {
  id?: string;
  annonceId: string;
  annonceTitle: string;
  ownerEmail: string;
  renterEmail: string;
  renterUid?: string;
  startDate: string;
  endDate: string;
  estimatedMonths?: number;
  estimatedDays?: number;
  totalPrice: number;
  currency?: string;
  status: 'pending' | 'approved' | 'denied';
  createdAt?: any;
};

@Component({
  selector: 'app-reservations',
  templateUrl: './reservations.page.html',
  styleUrls: ['./reservations.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  providers: [DatePipe]
})
export class ReservationsPage implements OnInit, OnDestroy {
  segment: 'incoming' | 'mine' = 'incoming';
  myEmail: string = '';

  incoming$: Observable<Reservation[]> | null = null;
  mine$: Observable<Reservation[]> | null = null;

  private sub: Subscription | null = null;

  constructor(
    private auth: AuthService,
    private firestore: Firestore,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {}

  ngOnInit(): void {
    const u = this.auth.getCurrentUserSnapshot();
    if (u?.email) this.myEmail = u.email;

    const col = collection(this.firestore, 'reservations');
    const incomingQ = query(col, where('ownerEmail', '==', this.myEmail));
    const mineQ = query(col, where('renterEmail', '==', this.myEmail));

    this.incoming$ = collectionData(incomingQ, { idField: 'id' }) as Observable<Reservation[]>;
    this.mine$ = collectionData(mineQ, { idField: 'id' }) as Observable<Reservation[]>;
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  async approve(r: Reservation): Promise<void> {
    try {
      const ref = doc(this.firestore, `reservations/${r.id}`);
      await updateDoc(ref, { status: 'approved' });

      // mark annonce as booked and set booked user path if renterUid available
      if (r.annonceId) {
        const annonceRef = doc(this.firestore, `annonces/${r.annonceId}`);
        const path = r.renterUid ? `/users/${r.renterUid}` : null;
        await updateDoc(annonceRef, {
          isBooked: true,
          ...(path ? { id_booked_user: path } : {})
        } as any);
      }

      // Notify renter
      const notificationsCol = collection(this.firestore, 'notifications');
      await addDoc(notificationsCol, {
        toEmail: r.renterEmail,
        type: 'reservation_status',
        reservationId: r.id,
        annonceId: r.annonceId,
        message: `Votre réservation pour "${r.annonceTitle}" a été approuvée.`,
        createdAt: serverTimestamp(),
        read: false
      } as any);

      const t = await this.toastCtrl.create({ message: 'Réservation approuvée', duration: 1500 });
      t.present();
    } catch (e) {
      console.error('approve error', e);
      const t = await this.toastCtrl.create({ message: 'Erreur approbation', duration: 2000 });
      t.present();
    }
  }

  async deny(r: Reservation): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Refuser la réservation ?',
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Refuser', role: 'destructive', handler: async () => {
            try {
              const ref = doc(this.firestore, `reservations/${r.id}`);
              await updateDoc(ref, { status: 'denied' });

              const notificationsCol = collection(this.firestore, 'notifications');
              await addDoc(notificationsCol, {
                toEmail: r.renterEmail,
                type: 'reservation_status',
                reservationId: r.id,
                annonceId: r.annonceId,
                message: `Votre réservation pour "${r.annonceTitle}" a été refusée.`,
                createdAt: serverTimestamp(),
                read: false
              } as any);

              const t = await this.toastCtrl.create({ message: 'Réservation refusée', duration: 1500 });
              t.present();
            } catch (e) {
              console.error('deny error', e);
              const t = await this.toastCtrl.create({ message: 'Erreur refus', duration: 2000 });
              t.present();
            }
          }
        }
      ]
    });
    alert.present();
  }
}
