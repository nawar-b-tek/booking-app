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
import { Camera, CameraResultType, CameraSource, Photo, PermissionStatus} from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { FirebaseService, CreateAdPayload } from '../../services/firebase.service';
import { AuthService } from '../../services/auth.service';
import { Capacitor } from '@capacitor/core';

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
    private authService: AuthService,
    private firebaseService: FirebaseService,
    private loadingCtrl: LoadingController
  ) {
    this.adForm = this.fb.group({
      title: ['', Validators.required],
      phone: ['', Validators.required],
      price: ['', [Validators.required, Validators.min(1)]],
      currency: ['TND', Validators.required],
      bedrooms: [0, [Validators.min(0)]],
      bathrooms: [0, [Validators.min(0)]],
      street: [''],
      city: [''],
      postalCode: [''],
      country: [''],
      contactEmail: [''],
      description: ['', [Validators.required, Validators.minLength(10)]],
    });

    const currentUser = this.authService.getCurrentUserSnapshot();
    if (currentUser?.email) {
      this.adForm.patchValue({ contactEmail: currentUser.email });
    }
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


  async takePhotoWithWebcam() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      const modal = document.createElement('div');
      modal.style.position = 'fixed';
      modal.style.top = '0';
      modal.style.left = '0';
      modal.style.width = '100vw';
      modal.style.height = '100vh';
      modal.style.background = 'rgba(0,0,0,0.8)';
      modal.style.display = 'flex';
      modal.style.justifyContent = 'center';
      modal.style.alignItems = 'center';
      modal.style.zIndex = '10000';
      modal.appendChild(video);

      const captureButton = document.createElement('button');
      captureButton.textContent = '📸 Capturer';
      captureButton.style.position = 'absolute';
      captureButton.style.bottom = '40px';
      captureButton.style.padding = '12px 24px';
      captureButton.style.fontSize = '18px';
      captureButton.style.cursor = 'pointer';
      modal.appendChild(captureButton);

      document.body.appendChild(modal);
      captureButton.onclick = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        this.photos.push(dataUrl);
        stream.getTracks().forEach((track) => track.stop());
        modal.remove();
      };
    } catch (err) {
      console.error('Erreur webcam:', err);
      await this.presentAlert(
        'Erreur caméra',
        'Impossible d’accéder à la caméra. Vérifiez les permissions du navigateur.'
      );
    }
  }



  async takePhoto() {
    const choice = await this.askPhotoSource();
    if (!choice) return;

    const platform = Capacitor.getPlatform();
    const isWeb = platform === 'web';

    if (isWeb && choice === 'camera') {
      
      this.takePhotoWithWebcam();
      return;
    }

    if (isWeb && choice === 'gallery') {
    
      this.openFilePickerAsFallback();
      return;
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
      const currentUser = this.authService.getCurrentUserSnapshot();
      if (!currentUser) {
        throw new Error('USER_NOT_AUTHENTICATED');
      }

      const formValue = this.adForm.value;
      const pricePerDay = Number(formValue.price);
      const bedrooms =
        formValue.bedrooms !== null && formValue.bedrooms !== undefined && formValue.bedrooms !== ''
          ? Number(formValue.bedrooms)
          : undefined;
      const bathrooms =
        formValue.bathrooms !== null &&
        formValue.bathrooms !== undefined &&
        formValue.bathrooms !== ''
          ? Number(formValue.bathrooms)
          : undefined;
      const contactEmail = (formValue.contactEmail || currentUser.email || '').trim();
      if (!contactEmail) {
        throw new Error('MISSING_OWNER_EMAIL');
      }

      const addressFields = {
        street: formValue.street?.trim(),
        city: formValue.city?.trim(),
        postal_code: formValue.postalCode?.trim(),
        country: formValue.country?.trim(),
      };
      const hasAddress = Object.values(addressFields).some((value) => !!value);

      const location =
        this.latitude !== undefined && this.longitude !== undefined
          ? { latitude: this.latitude, longitude: this.longitude }
          : undefined;

      const pricePerMonth = pricePerDay * 30;

      const payload: CreateAdPayload = {
        title: formValue.title,
        description: formValue.description,
        price: pricePerDay,
        price_per_day: pricePerDay,
        price_per_month: pricePerMonth,
        currency: formValue.currency,
        ...(bedrooms !== undefined ? { bedrooms } : {}),
        ...(bathrooms !== undefined ? { bathrooms } : {}),
        contact: {
          phone: formValue.phone,
          email: contactEmail,
        },
        ...(hasAddress ? { address: addressFields } : {}),
        ...(location ? { location } : {}),
        photosDataUrl: this.photos,
        posterId: currentUser.uid,
        user_id: contactEmail,
        ownerEmail: contactEmail,
        isBooked: false,
      };

      const result = await this.firebaseService.createAd(payload);
      console.log('Ad created:', result);
      await this.presentAlert('Success', 'Ad published successfully.');
      this.resetForm();
    } catch (err) {
      console.error('Ad creation failed', err);
      if (err instanceof Error && err.message === 'USER_NOT_AUTHENTICATED') {
        await this.presentAlert('Authentication required', 'You must be logged in to post an ad.');
      } else if (err instanceof Error && err.message === 'MISSING_OWNER_EMAIL') {
        await this.presentAlert(
          'Contact email required',
          'Please provide a contact email so renters can reach you.'
        );
      } else {
        await this.presentAlert('Error', 'Unable to publish the ad. Please try again later.');
      }
    } finally {
      await loading.dismiss();
    }
  }

  private resetForm() {
    const currentUser = this.authService.getCurrentUserSnapshot();
    this.adForm.reset({
      title: '',
      phone: '',
      price: '',
      currency: 'TND',
      bedrooms: 0,
      bathrooms: 0,
      street: '',
      city: '',
      postalCode: '',
      country: '',
      contactEmail: currentUser?.email || '',
      description: '',
    });
    this.photos = [];
    this.latitude = undefined;
    this.longitude = undefined;
  }
}
