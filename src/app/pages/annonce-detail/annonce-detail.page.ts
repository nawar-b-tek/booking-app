import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { Firestore, doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, addDoc } from '@angular/fire/firestore';
import { AuthService } from '../../services/auth.service';
import { ToastController, AlertController, LoadingController } from '@ionic/angular';

type Annonce = {
  id?: string;
  title: string;
  description: string;
  price_per_month: number;
  currency?: string;
  photos?: string[];
  user_id?: string; // owner email per provided sample
  isBooked?: boolean;
  id_booked_user?: string; // path string
  address?: {
    street?: string;
    city?: string;
    country?: string;
    postal_code?: string;
  };
  bathrooms?: number;
  bedrooms?: number;
  contact?: { email?: string; phone?: string };
  location?: any;
};

@Component({
  selector: 'app-annonce-detail',
  templateUrl: './annonce-detail.page.html',
  styleUrls: ['./annonce-detail.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class AnnonceDetailPage implements OnInit, OnDestroy {
  annonceId: string | null = null;
  annonce: Annonce | null = null;
  loading = false;

  startDate: string | null = null; // ISO string
  endDate: string | null = null;   // ISO string
  estimatedMonths = 0;
  totalPrice = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private firestore: Firestore,
    private auth: AuthService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController
  ) {}

  ngOnInit(): void {
    this.annonceId = this.route.snapshot.paramMap.get('id');
    if (!this.annonceId) {
      this.router.navigate(['/home']);
      return;
    }
    this.fetchAnnonce();
  }

  ngOnDestroy(): void {}

  private async fetchAnnonce(): Promise<void> {
    try {
      this.loading = true;
      const ref = doc(this.firestore, `annonces/${this.annonceId}`);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        const t = await this.toastCtrl.create({ message: 'Annonce introuvable', duration: 2000 });
        t.present();
        this.router.navigate(['/home']);
        return;
      }
      this.annonce = { id: snap.id, ...(snap.data() as any) } as Annonce;
      this.recalculate();
    } catch (e) {
      console.error('fetchAnnonce error', e);
      const t = await this.toastCtrl.create({ message: 'Erreur de chargement', duration: 2000 });
      t.present();
    } finally {
      this.loading = false;
    }
  }

  onDatesChanged(): void {
    this.recalculate();
  }

  private recalculate(): void {
    if (!this.annonce) return;
    const price = this.annonce.price_per_month || 0;
    const months = this.computeEstimatedMonths();
    this.estimatedMonths = months;
    this.totalPrice = months > 0 ? months * price : 0;
  }

  private computeEstimatedMonths(): number {
    if (!this.startDate || !this.endDate) return 0;
    const s = new Date(this.startDate);
    const e = new Date(this.endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
    if (e <= s) return 0;
    const ms = e.getTime() - s.getTime();
    const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.ceil(days / 30));
  }

  async requestReservation(): Promise<void> {
    const user = this.auth.getCurrentUserSnapshot();
    if (!user) {
      const alert = await this.alertCtrl.create({
        header: 'Connexion requise',
        message: 'Veuillez vous connecter pour réserver.',
        buttons: [
          { text: 'Annuler', role: 'cancel' },
          { text: 'Se connecter', handler: () => this.router.navigate(['/login'], { queryParams: { returnUrl: `/annonces/${this.annonceId}` } }) }
        ]
      });
      alert.present();
      return;
    }

    if (!this.annonce || !this.startDate || !this.endDate || this.estimatedMonths <= 0) {
      const t = await this.toastCtrl.create({ message: 'Veuillez choisir des dates valides', duration: 2000 });
      t.present();
      return;
    }

    const loader = await this.loadingCtrl.create({ message: 'Envoi de la demande...' });
    await loader.present();

    try {
      const reservationsCol = collection(this.firestore, 'reservations');
      const renterEmail = user.email || '';
      const renterUid = user.uid;
      const ownerEmail = this.annonce.user_id || '';

      const reservation = {
        annonceId: this.annonce.id,
        annonceTitle: this.annonce.title,
        ownerEmail,
        renterEmail,
        renterUid,
        startDate: this.startDate,
        endDate: this.endDate,
        estimatedMonths: this.estimatedMonths,
        currency: this.annonce.currency || 'TND',
        totalPrice: this.totalPrice,
        status: 'pending', // pending | approved | denied
        createdAt: serverTimestamp()
      };

      const resDocRef = await addDoc(reservationsCol, reservation as any);

      // Create a notification to owner (simple in-app notification)
      const notificationsCol = collection(this.firestore, 'notifications');
      await addDoc(notificationsCol, {
        toEmail: ownerEmail,
        type: 'reservation_request',
        annonceId: this.annonce.id,
        reservationId: resDocRef.id,
        message: `Nouvelle demande pour "${this.annonce.title}" du ${new Date(this.startDate).toLocaleDateString()} au ${new Date(this.endDate).toLocaleDateString()} de ${renterEmail}.`,
        createdAt: serverTimestamp(),
        read: false
      } as any);

      const t = await this.toastCtrl.create({ message: 'Demande envoyée au propriétaire', duration: 2000 });
      t.present();
      this.router.navigate(['/reservations']);
    } catch (e) {
      console.error('requestReservation error', e);
      const t = await this.toastCtrl.create({ message: 'Erreur lors de la réservation', duration: 2500 });
      t.present();
    } finally {
      loader.dismiss();
    }
  }
}
