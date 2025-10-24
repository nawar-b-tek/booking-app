import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { Firestore, collection, collectionData, doc, updateDoc, serverTimestamp, addDoc, query, where } from '@angular/fire/firestore';
import { Observable, Subscription } from 'rxjs';
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

  ngOnDestroy(): void { 
    this.sub?.unsubscribe(); 
  }

  /**
   * acept/mettre à jour/marqué reservé/notifier
   */
  async approve(r: Reservation): Promise<void> {
    try {
      const ref = doc(this.firestore, `reservations/${r.id}`);
      await updateDoc(ref, { status: 'approved' });

      // sataus réservé
      if (r.annonceId) {
        const annonceRef = doc(this.firestore, `annonces/${r.annonceId}`);
        const path = r.renterUid ? `/users/${r.renterUid}` : null;
        await updateDoc(annonceRef, {
          isBooked: true,
          ...(path ? { id_booked_user: path } : {})
        } as any);
      }

      //notif
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

      const toast = await this.toastCtrl.create({ 
        message: 'Réservation approuvée avec succès', 
        duration: 2000,
        color: 'success',
        position: 'top'
      });
      await toast.present();
    } catch (e) {
      console.error('Erreur lors de l\'approbation', e);
      const toast = await this.toastCtrl.create({ 
        message: 'Erreur lors de l\'approbation', 
        duration: 2000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
    }
  }

  /**
   refu res/confirm/mis àjour sataus/notif locataire
   */
  async deny(r: Reservation): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Refuser la réservation ?',
      message: `Êtes-vous sûr de vouloir refuser la réservation de ${r.renterEmail} ?`,
      buttons: [
        { 
          text: 'Annuler', 
          role: 'cancel' 
        },
        {
          text: 'Refuser', 
          role: 'destructive', 
          handler: async () => {
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

              const toast = await this.toastCtrl.create({ 
                message: 'Réservation refusée', 
                duration: 2000,
                color: 'warning',
                position: 'top'
              });
              await toast.present();
            } catch (e) {
              console.error('Erreur lors du refus', e);
              const toast = await this.toastCtrl.create({ 
                message: 'Erreur lors du refus', 
                duration: 2000,
                color: 'danger',
                position: 'top'
              });
              await toast.present();
            }
          }
        }
      ]
    });
    await alert.present();
  }

 
  getStatusIcon(status: string): string {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'approved':
        return 'checkmark-circle-outline';
      case 'denied':
        return 'close-circle-outline';
      default:
        return 'help-outline';
    }
  }

  
  getStatusLabel(status: string): string {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'approved':
        return 'Approuvée';
      case 'denied':
        return 'Refusée';
      default:
        return status;
    }
  }
}