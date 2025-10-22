import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { of } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { UserAccountPage } from './user-account.page';

describe('UserAccountPage', () => {
  let component: UserAccountPage;
  let fixture: ComponentFixture<UserAccountPage>;

  const authServiceStub: Partial<AuthService> = {
    authState$: of(null),
    getCurrentUserSnapshot: () => null,
    getUserProfileData: async () => null,
    reauthenticate: async () => undefined,
    updateProfileDisplayName: async () => undefined,
    updateEmailAddress: async () => undefined,
    updateUserProfileDoc: async () => undefined,
    updateUserPassword: async () => undefined
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UserAccountPage],
      imports: [FormsModule, IonicModule.forRoot()],
      providers: [{ provide: AuthService, useValue: authServiceStub }]
    }).compileComponents();

    fixture = TestBed.createComponent(UserAccountPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
