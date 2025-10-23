// src/app/services/firebase.service.ts
import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  private app = initializeApp(environment.firebase);
  private storage = getStorage(this.app);
  private firestore = getFirestore(this.app);

  private dataURLtoBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
  }

  async uploadImageDataUrl(dataUrl: string, userId = 'anon'): Promise<string> {
    const blob = this.dataURLtoBlob(dataUrl);
    const timestamp = Date.now();
    const path = `ads/${userId}/${timestamp}.jpg`;
    const storageRef = ref(this.storage, path);
    const snapshot = await uploadBytes(storageRef, blob);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  }

  async createAd(adPayload: {
    title: string;
    phone: string;
    price: number;
    latitude?: number;
    longitude?: number;
    photosDataUrl?: string[]; // DataURL strings
    userId?: string;
  }) {
    const { photosDataUrl = [], userId = 'anon', ...meta } = adPayload;

    // Upload images (en parallèle)
    const uploadPromises = photosDataUrl.map(d => this.uploadImageDataUrl(d, userId));
    const photosUrls = await Promise.all(uploadPromises);

    // Créer le document Firestore
    const doc = {
      ...meta,
      photos: photosUrls,
      userId,
      createdAt: serverTimestamp()
    };

    const adsCol = collection(this.firestore, 'annonces'); // ta collection s'appelle 'annonces' d'après ton screenshot
    const docRef = await addDoc(adsCol, doc);
    return { id: docRef.id, ...doc };
  }
}
