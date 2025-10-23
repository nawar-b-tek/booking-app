import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AnnonceDetailPage } from './annonce-detail.page';

const routes: Routes = [
  {
    path: '',
    component: AnnonceDetailPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AnnonceDetailPageRoutingModule {}

