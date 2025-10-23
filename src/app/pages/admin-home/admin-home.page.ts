import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { Chart, registerables } from 'chart.js';
import { Subscription } from 'rxjs';
import { IonicModule } from '@ionic/angular';

Chart.register(...registerables);

@Component({
  selector: 'app-admin-home',
  templateUrl: './admin-home.page.html',
  styleUrls: ['./admin-home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class AdminHomePage implements OnInit, OnDestroy {
  totalAds = 0;
  bookedAds = 0;
  totalUsers = 0;
  bookedPercentage = 0;

  private adsSub?: Subscription;
  private usersSub?: Subscription;
  private lineChart?: Chart;

  constructor(private firestore: Firestore, private router: Router) {}

  ngOnInit(): void {
    this.loadStatistics();
  }

  ngOnDestroy(): void {
    this.adsSub?.unsubscribe();
    this.usersSub?.unsubscribe();
    this.lineChart?.destroy();
  }

  goTo(page: string) {
    switch (page) {
      case 'users':
        this.router.navigateByUrl('/admin/admin-users');
        break;
      case 'announcements':
        this.router.navigateByUrl('/admin/home/announcements');
        break;
      case 'reservations':
        this.router.navigateByUrl('/admin/home/reservations');
        break;
      default:
        break;
    }
  }

  async loadStatistics() {
    const adsCollection = collection(this.firestore, 'annonces');
    const usersCollection = collection(this.firestore, 'users');

    this.adsSub = collectionData(adsCollection, { idField: 'id' }).subscribe((ads: any[]) => {
      console.log('Fetched ads:', ads);
      this.totalAds = Array.isArray(ads) ? ads.length : 0;
      this.bookedAds = ads.filter((ad) => ad?.isBooked === true).length;
      this.bookedPercentage = this.totalAds > 0 ? Math.round((this.bookedAds / this.totalAds) * 100) : 0;

      this.createLineChart();
    });

    this.usersSub = collectionData(usersCollection, { idField: 'id' }).subscribe((users: any[]) => {
      console.log('Fetched users:', users);
      this.totalUsers = Array.isArray(users) ? users.length : 0;
    });
  }

  createLineChart() {
    if (this.lineChart) {
      this.lineChart.destroy();
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
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true, position: 'bottom' },
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
        },
      },
    });
  }

  getProgressGradient(percent: number): string {
    return `conic-gradient(#17a2b8 ${percent}%, #eee ${percent}% 100%)`;
  }
}
