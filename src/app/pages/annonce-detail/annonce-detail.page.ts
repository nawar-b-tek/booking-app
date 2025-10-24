import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { Firestore, doc, getDoc, collection, addDoc, serverTimestamp } from '@angular/fire/firestore';
import { AuthService } from '../../services/auth.service';
import { ToastController, AlertController, LoadingController } from '@ionic/angular';

type Annonce = {
  id?: string;
  title: string;
  description: string;
  price?: number;
  price_per_day?: number;
  price_per_month?: number;
  currency?: string;
  photos?: string[];
  user_id?: string; 
  isBooked?: boolean;
  id_booked_user?: string; 
  address?: {
    street?: string;
    city?: string;
    country?: string;
    postal_code?: string;
  };
  bathrooms?: number;
  bedrooms?: number;
  contact?: { 
    email?: string; 
    phone?: string 
  };
  location?: { 
    latitude?: number; 
    longitude?: number; 
    lat?: number; 
    lng?: number 
  };
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

  // Dates de réservation (format ISO string)
  startDate: string | null = null;
  endDate: string | null = null;
  
  // Calculs de réservation
  estimatedDays = 0;
  totalPrice = 0;
  pricePerDay = 0;

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
    // id annonce de lURL
    this.annonceId = this.route.snapshot.paramMap.get('id');
    if (!this.annonceId) {
      this.router.navigate(['/home']);
      return;
    }
    this.fetchAnnonce();
  }

  ngOnDestroy(): void {}

  /**
   détails de annonce firestore
   */
  private async fetchAnnonce(): Promise<void> {
    try {
      this.loading = true;
      const ref = doc(this.firestore, `annonces/${this.annonceId}`);
      const snap = await getDoc(ref);
      
      if (!snap.exists()) {
        const toast = await this.toastCtrl.create({ 
          message: 'Annonce introuvable', 
          duration: 2000,
          color: 'danger'
        });
        await toast.present();
        this.router.navigate(['/home']);
        return;
      }
      
      this.annonce = { id: snap.id, ...(snap.data() as any) } as Annonce;
      this.recalculate();
    } catch (e) {
      console.error('Erreur lors du chargement de l\'annonce', e);
      const toast = await this.toastCtrl.create({ 
        message: 'Erreur de chargement', 
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      this.loading = false;
    }
  }

  /**
   * Gérer le changement de dates
   */
  onDatesChanged(): void {
    this.recalculate();
  }

  /**
   calculer le prix en fonction des dates 
   */
  private recalculate(): void {
    if (!this.annonce) return;
    
    // prix par jour
    const pricePerDay =
      this.annonce.price ??
      this.annonce.price_per_day ??
      (this.annonce.price_per_month ? this.annonce.price_per_month / 30 : 0);
    
    //nombre de jours
    const days = this.computeEstimatedDays();
    
    //mise à jour valeurs
    this.pricePerDay = pricePerDay;
    this.estimatedDays = days;
    this.totalPrice = days > 0 ? days * pricePerDay : 0;
  }

  /**
   nb jours de deb au fin
   */
  private computeEstimatedDays(): number {
    if (!this.startDate || !this.endDate) return 0;
    
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    
    // dates valides
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    if (end <= start) return 0;
    
    // calcul différence en j
    const milliseconds = end.getTime() - start.getTime();
    return Math.max(1, Math.ceil(milliseconds / (1000 * 60 * 60 * 24)));
  }

  /**
   demander res
   */
  async requestReservation(): Promise<void> {
    // vérifier user loged
    const user = this.auth.getCurrentUserSnapshot();
    if (!user) {
      const alert = await this.alertCtrl.create({
        header: 'Connexion requise',
        message: 'Veuillez vous connecter pour réserver ce logement.',
        buttons: [
          { 
            text: 'Annuler', 
            role: 'cancel' 
          },
          { 
            text: 'Se connecter', 
            handler: () => this.router.navigate(['/login'], { 
              queryParams: { returnUrl: `/annonces/${this.annonceId}` } 
            })
          }
        ]
      });
      await alert.present();
      return;
    }

    // verification des données
    if (!this.annonce || !this.startDate || !this.endDate || this.estimatedDays <= 0) {
      const toast = await this.toastCtrl.create({ 
        message: 'Veuillez choisir des dates valides', 
        duration: 2000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    // loader de creation de res
    const loader = await this.loadingCtrl.create({ 
      message: 'Envoi de la demande...' 
    });
    await loader.present();

    try {
      const reservationsCol = collection(this.firestore, 'reservations');
      const renterEmail = user.email || '';
      const renterUid = user.uid;
      const ownerEmail = this.annonce.user_id || '';

      // calcul nb mois
      const estimatedMonths = Math.max(1, Math.ceil(this.estimatedDays / 30));

      // créer reservation(objet)
      const reservation = {
        annonceId: this.annonce.id,
        annonceTitle: this.annonce.title,
        ownerEmail,
        renterEmail,
        renterUid,
        startDate: this.startDate,
        endDate: this.endDate,
        estimatedDays: this.estimatedDays,
        estimatedMonths,
        currency: this.annonce.currency || 'TND',
        totalPrice: this.totalPrice,
        status: 'pending', 
        createdAt: serverTimestamp()
      };

      // enregister reservation
      const resDocRef = await addDoc(reservationsCol, reservation as any);

      // create notif au proprietire
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

      // succé
      const toast = await this.toastCtrl.create({ 
        message: 'Demande envoyée au propriétaire', 
        duration: 2500,
        color: 'success',
        position: 'top'
      });
      await toast.present();
      
      //allez réserver
      this.router.navigate(['/reservations']);
    } catch (e) {
      console.error('Erreur lors de la réservation', e);
      const toast = await this.toastCtrl.create({ 
        message: 'Erreur lors de la réservation', 
        duration: 2500,
        color: 'danger'
      });
      await toast.present();
    } finally {
      loader.dismiss();
    }
  }
}
