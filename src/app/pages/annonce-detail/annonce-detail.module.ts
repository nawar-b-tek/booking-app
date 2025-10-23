import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { AnnonceDetailPageRoutingModule } from './annonce-detail-routing.module';
import { AnnonceDetailPage } from './annonce-detail.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, AnnonceDetailPageRoutingModule, AnnonceDetailPage],
  declarations: []
})
export class AnnonceDetailPageModule {}
