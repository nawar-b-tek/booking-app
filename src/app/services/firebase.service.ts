import { Injectable } from '@angular/core';
import { addDoc, collection, getFirestore, serverTimestamp } from 'firebase/firestore';
import { getApp, getApps, initializeApp } from 'firebase/app';

import { environment } from '../../environments/environment';

type Address = {
  street?: string;
  city?: string;
  postal_code?: string;
  country?: string;
};

type Location = {
  latitude: number;
  longitude: number;
};

type Contact = {
  phone: string;
  email: string;
};

export type CreateAdPayload = {
  title: string;
  description: string;
  price: number;
  price_per_day: number;
  price_per_month: number;
  currency: string;
  contact: Contact;
  photosDataUrl?: string[];
  posterId: string;
  user_id: string;
  ownerEmail: string;
  isBooked: boolean;
  bedrooms?: number;
  bathrooms?: number;
  address?: Address;
  location?: Location;
};

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  private app = getApps().length ? getApp() : initializeApp(environment.firebase);
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

  private async uploadImageDataUrl(dataUrl: string, posterId: string): Promise<string> {
    const { cloudinary } = environment;
    if (!cloudinary?.cloudName || !cloudinary?.uploadPreset) {
      throw new Error('Cloudinary configuration is missing.');
    }

    const blob = this.dataURLtoBlob(dataUrl);
    const filename = `${Date.now()}-${posterId}.jpg`;
    const formData = new FormData();
    formData.append('file', blob, filename);
    formData.append('upload_preset', cloudinary.uploadPreset);

    const targetFolder = cloudinary.folder ? `${cloudinary.folder}/${posterId}` : `ads/${posterId}`;
    formData.append('folder', targetFolder);

    if (cloudinary.apiKey) {
      formData.append('api_key', cloudinary.apiKey);
    }

    const endpoint = `https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/image/upload`;
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    const json = await response.json();
    if (!response.ok) {
      const message = json?.error?.message ?? 'Cloudinary upload failed';
      throw new Error(message);
    }

    return json.secure_url as string;
  }

  private removeUndefined<T>(value: T): T {
    if (Array.isArray(value)) {
      return value
        .map((item) => this.removeUndefined(item))
        .filter((item) => item !== undefined) as unknown as T;
    }

    if (value && typeof value === 'object') {
      if (
        value instanceof Date ||
        value instanceof Blob ||
        value instanceof File ||
        value instanceof FormData
      ) {
        return value;
      }

      const cleaned: Record<string, unknown> = {};
      Object.entries(value as Record<string, unknown>).forEach(([key, val]) => {
        if (val === undefined) {
          return;
        }
        cleaned[key] = this.removeUndefined(val);
      });

      return cleaned as T;
    }

    return value;
  }

  async createAd(adPayload: CreateAdPayload) {
    const { photosDataUrl = [], posterId, ...meta } = adPayload;
    if (!posterId) {
      throw new Error('Missing poster identifier for the ad.');
    }

    const photosUrls = await Promise.all(
      photosDataUrl.map((dataUrl) => this.uploadImageDataUrl(dataUrl, posterId))
    );

    const doc = this.removeUndefined({
      ...meta,
      photos: photosUrls,
      posterId,
      userId: posterId,
      createdAt: serverTimestamp(),
    });

    const adsCollection = collection(this.firestore, 'annonces');
    const docRef = await addDoc(adsCollection, doc);
    return { id: docRef.id, ...doc };
  }
}
