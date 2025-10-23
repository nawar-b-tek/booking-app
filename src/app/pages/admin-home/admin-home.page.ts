import { Component, OnInit, OnDestroy } from '@angular/core';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { Chart, registerables } from 'chart.js';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router'; // <-- ajouté

Chart.register(...registerables);

@Component({
  selector: 'app-admin-home',
  templateUrl: './admin-home.page.html',
  styleUrls: ['./admin-home.page.scss'],
})
export class AdminHomePage implements OnInit, OnDestroy {
  totalAds = 0;
  bookedAds = 0;
  totalUsers = 0;
  bookedPercentage = 0;

  private adsSub: Subscription | null = null;
  private usersSub: Subscription | null = null;
  private lineChart: any = null;

  // inject Router pour la navigation
  constructor(private firestore: Firestore, private router: Router) {}

  ngOnInit() {
    this.loadStatistics();
  }

  ngOnDestroy() {
    if (this.adsSub) this.adsSub.unsubscribe();
    if (this.usersSub) this.usersSub.unsubscribe();
    if (this.lineChart) {
      try { this.lineChart.destroy(); } catch (e) { console.warn('chart destroy error', e); }
    }
  }

  goTo(page: string) {
  if (page === 'users') {
    // navigation ABSOLUE vers /admin/admin-users
    this.router.navigateByUrl('/admin/admin-users');
  } else if (page === 'announcements') {
    // exemple : page interne ou externe
    this.router.navigateByUrl('/admin/home/announcements'); // à adapter
  } else if (page === 'reservations') {
    this.router.navigateByUrl('/admin/home/reservations'); // à adapter
  }
}



  async loadStatistics() {
    const annoncesRef = collection(this.firestore, 'annonces');
    const usersRef = collection(this.firestore, 'users');

    // --- SUBSCRIBE annonces (live)
    this.adsSub = collectionData(annoncesRef, { idField: 'id' })
      .subscribe((ads: any[]) => {
        console.log('[subscribe] annonces reçues:', ads);
        this.totalAds = Array.isArray(ads) ? ads.length : 0;

        // Debug : afficher les valeurs distinctes de isBooked
        const bookedCounts = new Map<string, number>();
        ads.forEach(a => {
          const v = a && a.isBooked !== undefined ? String(a.isBooked) : '<<missing>>';
          bookedCounts.set(v, (bookedCounts.get(v) || 0) + 1);
        });
        console.log('Distinct isBooked values:', Array.from(bookedCounts.entries()));

        // Comptage des annonces réservées
        this.bookedAds = ads.filter(a => a && a.isBooked === true).length;

        // Pourcentage
        this.bookedPercentage = this.totalAds > 0
          ? Math.round((this.bookedAds / this.totalAds) * 100)
          : 0;

        this.createLineChart();
      });

    // --- SUBSCRIBE users (live)
    this.usersSub = collectionData(usersRef, { idField: 'id' })
      .subscribe((users: any[]) => {
        console.log('[subscribe] users reçus:', users);
        this.totalUsers = Array.isArray(users) ? users.length : 0;
      });
  }

  createLineChart() {
    if (this.lineChart) {
      try { this.lineChart.destroy(); } catch (e) { console.warn('destroy chart err', e); }
      this.lineChart = null;
    }

    this.lineChart = new Chart('lineChart', {
      type: 'line',
      data: {
        labels: ['Posted', 'Booked'],
        datasets: [
          {
            label: 'Ads',
            data: [this.totalAds, this.bookedAds],
            borderColor: '#129cbeff',
            backgroundColor: 'rgba(23,162,184,0.2)',
            fill: true,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true, position: 'bottom' }
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    });
  }

  getProgressGradient(percent: number): string {
    return `conic-gradient(#17a2b8 ${percent}%, #eee ${percent}% 100%)`;
  }
}
