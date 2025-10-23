import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ActionSheetController,
  AlertController,
  IonicModule,
  LoadingController,
} from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';

import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'app-post-ad',
  templateUrl: './post-ad.page.html',
  styleUrls: ['./post-ad.page.scss'],
  standalone: true,
  imports: [IonicModule, ReactiveFormsModule, RouterModule, CommonModule],
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

  async getCurrentLocation() {
    try {
      const position = await Geolocation.getCurrentPosition();
      this.latitude = position.coords.latitude;
      this.longitude = position.coords.longitude;
    } catch (err) {
      console.error('Geolocation error', err);
      await this.presentAlert(
        'Location error',
        'Unable to retrieve the current position. Please check permissions and try again.'
      );
    }
  }

  async takePhoto() {
    const choice = await this.askPhotoSource();
    if (!choice) {
      return;
    }

    const platform = Capacitor.getPlatform();
    const isWeb = platform === 'web';

    if (isWeb) {
      this.openFilePickerAsFallback();
      return;
    }

    try {
      const photo: Photo = await Camera.getPhoto({
        quality: 80,
        resultType: CameraResultType.DataUrl,
        source: choice === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      });

      if (photo?.dataUrl) {
        this.photos.push(photo.dataUrl);
      } else {
        console.warn('Camera returned no Data URL', photo);
      }
    } catch (err) {
      console.error('Camera.getPhoto error', err);
      await this.presentAlert(
        'Camera error',
        'Unable to access the camera. You can pick an image from the gallery instead.'
      );
      this.openFilePickerAsFallback();
    }
  }

  async askPhotoSource(): Promise<'camera' | 'gallery' | null> {
    const action = await this.actionSheetCtrl.create({
      header: 'Add a photo',
      buttons: [
        { text: 'Camera', role: 'camera' },
        { text: 'Gallery', role: 'gallery' },
        { text: 'Cancel', role: 'cancel' },
      ],
    });

    await action.present();
    const result = await action.onDidDismiss();
    const role = result?.role;

    if (role === 'camera' || role === 'gallery') {
      return role;
    }
    return null;
  }

  openFilePickerAsFallback() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = false;

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string | undefined;
        if (dataUrl) {
          this.photos.push(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    };

    input.click();
  }

  async presentAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK'],
    });
    await alert.present();
  }

  async submitAd() {
    if (this.adForm.invalid) {
      await this.presentAlert('Incomplete form', 'Please fill in all required fields.');
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Submitting ad...' });
    await loading.present();

    try {
      const payload = {
        title: this.adForm.value.title,
        phone: this.adForm.value.phone,
        price: Number(this.adForm.value.price),
        latitude: this.latitude,
        longitude: this.longitude,
        description: this.adForm.value.description,
        photosDataUrl: this.photos,
        userId: 'anon',
      };

      const result = await this.firebaseService.createAd(payload);
      console.log('Ad created:', result);
      await this.presentAlert('Success', 'Ad published successfully.');
      this.resetForm();
    } catch (err) {
      console.error('Ad creation failed', err);
      await this.presentAlert('Error', 'Unable to publish the ad. Please try again later.');
    } finally {
      await loading.dismiss();
    }
  }

  private resetForm() {
    this.adForm.reset();
    this.photos = [];
    this.latitude = undefined;
    this.longitude = undefined;
  }
}
