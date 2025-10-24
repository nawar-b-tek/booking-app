import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, query, where, updateDoc, getDocs } from '@angular/fire/firestore';
import { Observable, map, of } from 'rxjs';

export type NotificationType = 'reservation_request' | 'reservation_status';

export interface AppNotification {
  id: string;
  toEmail: string;
  type: NotificationType;
  message: string;
  annonceId?: string;
  reservationId?: string;
  createdAt?: unknown;
  read?: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  constructor(private firestore: Firestore) {}

  observeUnread(email: string): Observable<AppNotification[]> {
    if (!email) {
      return of([]);
    }

    const ref = collection(this.firestore, 'notifications');
    const q = query(ref, where('toEmail', '==', email), where('read', '==', false));
    return collectionData(q, { idField: 'id' }).pipe(map((docs) => docs as AppNotification[]));
  }

  observeUnreadCount(email: string): Observable<number> {
    return this.observeUnread(email).pipe(map((notifications) => notifications.length));
  }

  async markAllAsRead(email: string): Promise<void> {
    if (!email) {
      return;
    }

    const ref = collection(this.firestore, 'notifications');
    const q = query(ref, where('toEmail', '==', email), where('read', '==', false));
    const snapshot = await getDocs(q);

    const updates = snapshot.docs.map((d) => updateDoc(d.ref, { read: true }));
    await Promise.all(updates);
  }
}
