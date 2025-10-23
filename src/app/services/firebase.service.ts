import { Injectable } from '@angular/core';
import { addDoc, collection, getFirestore, serverTimestamp } from 'firebase/firestore';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';

import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  private app = getApps().length ? getApp() : initializeApp(environment.firebase);
  private storage = getStorage(this.app);
  private firestore = getFirestore(this.app);

  private dataURLtoBlob(dataUrl: string): Blob {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const binary = atob(parts[1]);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    return new Blob([bytes], { type: mime });
  }

  async uploadImageDataUrl(dataUrl: string, userId = 'anon'): Promise<string> {
    const blob = this.dataURLtoBlob(dataUrl);
    const timestamp = Date.now();
    const path = `ads/${userId}/${timestamp}.jpg`;
    const storageRef = ref(this.storage, path);
    const snapshot = await uploadBytes(storageRef, blob);
    return getDownloadURL(snapshot.ref);
  }

  async createAd(adPayload: {
    title: string;
    phone: string;
    price: number;
    latitude?: number;
    longitude?: number;
    photosDataUrl?: string[];
    userId?: string;
  }) {
    const { photosDataUrl = [], userId = 'anon', ...meta } = adPayload;

    const photosUrls = await Promise.all(
      photosDataUrl.map((dataUrl) => this.uploadImageDataUrl(dataUrl, userId))
    );

    const doc = {
      ...meta,
      photos: photosUrls,
      userId,
      createdAt: serverTimestamp(),
    };

    const adsCollection = collection(this.firestore, 'annonces');
    const docRef = await addDoc(adsCollection, doc);
    return { id: docRef.id, ...doc };
  }
}
