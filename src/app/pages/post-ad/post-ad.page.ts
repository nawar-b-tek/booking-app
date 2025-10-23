import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { IonicModule, AlertController, ActionSheetController } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { FirebaseService } from '../../services/firebase.service'; 
import { LoadingController } from '@ionic/angular';
@Component({
  selector: 'app-post-ad',
  templateUrl: './post-ad.page.html',
  styleUrls: ['./post-ad.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    ReactiveFormsModule,
    RouterModule,
    CommonModule
  ]
})
export class PostAdPage {
  adForm: FormGroup;
  latitude?: number;
  longitude?: number;
  photos: string[] = [];

  constructor(
    private fb: FormBuilder,
    private alertCtrl: AlertController,
    private actionSheetCtrl: ActionSheetController,
    private firebaseService: FirebaseService,
    private loadingCtrl: LoadingController
  ) {
    this.adForm = this.fb.group({
      title: ['', Validators.required],
      phone: ['', Validators.required],
      price: ['', [Validators.required, Validators.min(1)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  // --- Géolocalisation
  async getCurrentLocation() {
    try {
      const position = await Geolocation.getCurrentPosition();
      this.latitude = position.coords.latitude;
      this.longitude = position.coords.longitude;
    } catch (err) {
      console.error('Geolocation error', err);
      await this.presentAlert('Erreur localisation', 'Impossible de récupérer la position. Vérifiez les permissions et réessayez.');
    }
  }

  // --- Ajouter une photo (choice Caméra / Galerie)
  async takePhoto() {
    const choice = await this.askPhotoSource();
    if (!choice) return; // annulation

    const platform = Capacitor.getPlatform(); // 'web' | 'ios' | 'android' | ...
    const isWeb = platform === 'web';

    if (isWeb) {
      // fallback navigateur : file picker
      this.openFilePickerAsFallback();
      return;
    }

    // mode natif : utiliser le plugin Camera
    try {
      const photo: Photo = await Camera.getPhoto({
        quality: 80,
        resultType: CameraResultType.DataUrl, // DataUrl est pratique pour <ion-img src="...">
        source: choice === 'camera' ? CameraSource.Camera : CameraSource.Photos
      });

      if (photo && photo.dataUrl) {
        this.photos.push(photo.dataUrl);
      } else {
        console.warn('Aucune image reçue du plugin Camera', photo);
      }
    } catch (err) {
      console.error('Camera.getPhoto error', err);
      await this.presentAlert('Erreur caméra', 'Impossible d’accéder à la caméra. Vous pouvez sélectionner une image depuis la galerie.');
      // proposer fallback
      this.openFilePickerAsFallback();
    }
  }

  // --- Action sheet pour choisir Camera / Gallery
  async askPhotoSource(): Promise<'camera' | 'gallery' | null> {
    const action = await this.actionSheetCtrl.create({
      header: 'Ajouter une photo',
      buttons: [
        { text: 'Caméra', role: 'camera' },
        { text: 'Galerie', role: 'gallery' },
        { text: 'Annuler', role: 'cancel' }
      ]
    });

    await action.present();
    const result = await action.onDidDismiss();
    const role = result?.role;

    if (role === 'camera') return 'camera';
    if (role === 'gallery') return 'gallery';
    return null;
  }

  // --- Fallback web : file picker
  openFilePickerAsFallback() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = false;

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) {
          this.photos.push(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    };

    input.click();
  }

  // --- Helper : afficher une alerte simple
  async presentAlert(header: string, message: string) {
    const a = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK']
    });
    await a.present();
  }

  async submitAd() {
    if (this.adForm.invalid) {
      this.presentAlert('Formulaire incomplet', 'Merci de remplir tous les champs requis.');
      return;
    }
    const payload = {
      title: this.adForm.value.title,
      phone: this.adForm.value.phone,
      price: Number(this.adForm.value.price),
      latitude: this.latitude,
      longitude: this.longitude,
      description: this.adForm.value.description,
      photosDataUrl: this.photos, // array of DataURL strings
      userId: 'anon' // remplace par UID si tu utilises Firebase Auth
    };

    const loading = await this.loadingCtrl.create({ message: 'Publication en cours...' });
    await loading.present();

    try {
      const result = await this.firebaseService.createAd(payload);
      await loading.dismiss();
      console.log('Annonce créée :', result);
      await this.presentAlert('Succès', 'Annonce publiée !');
      // Optionnel: reset du formulaire
      this.adForm.reset();
      this.photos = [];
      this.latitude = undefined; this.longitude = undefined;
      // Optionnel: navigation vers la page detail de l'annonce
      // this.router.navigate(['/ad', result.id]);
    } catch (err) {
      console.error('Erreur création annonce', err);
      await loading.dismiss();
      await this.presentAlert('Erreur', 'Impossible de publier l’annonce. Réessaie plus tard.');
    }
  }

}
