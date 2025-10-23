import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';

import { AuthService } from '../../services/auth.service';

interface AccountForm {
  displayName: string;
  email: string;
  phone: string;
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

@Component({
  selector: 'app-user-account',
  templateUrl: './user-account.page.html',
  styleUrls: ['./user-account.page.scss'],
  standalone: false
})
export class UserAccountPage implements OnInit {
  accountForm: AccountForm = {
    displayName: '',
    email: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  };

  private originalValues = {
    displayName: '',
    email: '',
    phone: ''
  };

  saving = false;

  constructor(private auth: AuthService, private toastCtrl: ToastController) {}

  async ngOnInit(): Promise<void> {
    await this.loadAccountDetails();
  }

  private async loadAccountDetails(): Promise<void> {
    const user = this.auth.getCurrentUserSnapshot();
    if (!user) {
      return;
    }
    const profileData = await this.auth.getUserProfileData(user.uid);

  this.accountForm.displayName = user.displayName ?? (profileData?.['displayName'] as string) ?? '';
    this.accountForm.email = user.email ?? '';
  this.accountForm.phone = (profileData?.['phone'] as string) ?? '';

    this.originalValues = {
      displayName: this.accountForm.displayName,
      email: this.accountForm.email,
      phone: this.accountForm.phone
    };
  }

  private hasProfileChanges(): boolean {
    return (
      this.accountForm.displayName !== this.originalValues.displayName ||
      this.accountForm.email !== this.originalValues.email ||
      this.accountForm.phone !== this.originalValues.phone
    );
  }

  async saveChanges(): Promise<void> {
    if (this.saving) return;

    const user = this.auth.getCurrentUserSnapshot();
    if (!user) {
      await this.presentToast('Aucun utilisateur connecté.', 'danger');
      return;
    }

    const wantsPasswordChange =
      this.accountForm.newPassword.trim().length > 0 ||
      this.accountForm.confirmNewPassword.trim().length > 0;

    if (wantsPasswordChange && this.accountForm.newPassword !== this.accountForm.confirmNewPassword) {
      await this.presentToast('Les mots de passe ne correspondent pas.', 'danger');
      return;
    }

    if (!this.hasProfileChanges() && !wantsPasswordChange) {
      await this.presentToast('Aucune modification détectée.', 'medium');
      return;
    }

    if (!this.accountForm.currentPassword.trim()) {
      await this.presentToast('Veuillez saisir votre mot de passe actuel pour enregistrer les modifications.', 'warning');
      return;
    }

    const profileUpdates: Record<string, unknown> = {};
    if (this.accountForm.displayName !== this.originalValues.displayName) {
  profileUpdates['displayName'] = this.accountForm.displayName;
    }
    if (this.accountForm.phone !== this.originalValues.phone) {
  profileUpdates['phone'] = this.accountForm.phone;
    }
    if (this.accountForm.email !== this.originalValues.email) {
  profileUpdates['email'] = this.accountForm.email;
    }

    this.saving = true;
    try {
      await this.auth.reauthenticate(this.accountForm.currentPassword.trim());

  if (profileUpdates['displayName'] !== undefined) {
        await this.auth.updateProfileDisplayName(this.accountForm.displayName); 
      }

  if (profileUpdates['email'] !== undefined) {
        await this.auth.updateEmailAddress(this.accountForm.email);
      }

      if (Object.keys(profileUpdates).length > 0) {
        await this.auth.updateUserProfileDoc(user.uid, profileUpdates);
      }

      if (wantsPasswordChange && this.accountForm.newPassword.trim()) {
        await this.auth.updateUserPassword(this.accountForm.newPassword.trim());
      }

      await this.presentToast('Profil mis à jour avec succès.', 'success');
      await this.loadAccountDetails();
      this.resetPasswordFields();
    } catch (err: any) {
      console.error('update account error', err);
      await this.presentToast(err?.message || 'Une erreur est survenue.', 'danger');
    } finally {
      this.saving = false;
      this.accountForm.currentPassword = '';
    }
  }

  private resetPasswordFields(): void {
    this.accountForm.newPassword = '';
    this.accountForm.confirmNewPassword = '';
  }

  private async presentToast(message: string, color: 'success' | 'danger' | 'warning' | 'medium'): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 2500, color });
    await toast.present();
  }
}
