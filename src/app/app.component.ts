import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { AppFooterComponent } from './components/app-footer/app-footer.component';
import { AppToolbarComponent } from './components/app-toolbar/app-toolbar.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild(AppToolbarComponent, { read: ElementRef })
  private toolbarRef?: ElementRef<HTMLElement>;

  @ViewChild(AppFooterComponent, { read: ElementRef })
  private footerRef?: ElementRef<HTMLElement>;

  private headerObserver?: ResizeObserver;
  private footerObserver?: ResizeObserver;

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.updateShellOffsets();
      this.observeShellElements();
    }, 0);
  }

  ngOnDestroy(): void {
    this.headerObserver?.disconnect();
    this.footerObserver?.disconnect();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateShellOffsets();
  }

  private updateShellOffsets(): void {
    const root = document.documentElement;

    const headerHeight = this.toolbarRef?.nativeElement?.offsetHeight ?? 88;
    const footerHeight = this.footerRef?.nativeElement?.offsetHeight ?? 64;

    root.style.setProperty('--app-toolbar-height', `${headerHeight}px`);
    root.style.setProperty('--app-footer-height', `${footerHeight}px`);
  }

  private observeShellElements(): void {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    if (this.toolbarRef?.nativeElement) {
      this.headerObserver = new ResizeObserver(() => this.updateShellOffsets());
      this.headerObserver.observe(this.toolbarRef.nativeElement);
    }

    if (this.footerRef?.nativeElement) {
      this.footerObserver = new ResizeObserver(() => this.updateShellOffsets());
      this.footerObserver.observe(this.footerRef.nativeElement);
    }
  }
}
