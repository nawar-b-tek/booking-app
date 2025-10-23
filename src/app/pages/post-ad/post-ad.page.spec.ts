import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PostAdPage } from './post-ad.page';

describe('PostAdPage', () => {
  let component: PostAdPage;
  let fixture: ComponentFixture<PostAdPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PostAdPage],
    }).compileComponents();

    fixture = TestBed.createComponent(PostAdPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
