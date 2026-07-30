import { afterNextRender, Directive, ElementRef, inject, OnDestroy } from '@angular/core';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

@Directive({
  selector: '[appModalFocusTrap]',
  host: {
    '(keydown)': 'onKeydown($event)',
  },
})
export class ModalFocusTrapDirective implements OnDestroy {
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly returnFocus = document.activeElement as HTMLElement | null;
  private readonly previousBodyOverflow = document.body.style.overflow;

  constructor() {
    document.body.style.overflow = 'hidden';
    afterNextRender(() => this.focusInitialElement());
  }

  onKeydown(keyboardEvent: KeyboardEvent): void {
    if (keyboardEvent.key !== 'Tab') return;
    const elements = this.focusableElements();
    if (!elements.length) {
      keyboardEvent.preventDefault();
      this.host.nativeElement.focus({ preventScroll: true });
      return;
    }

    const first = elements[0];
    const last = elements[elements.length - 1];
    const active = document.activeElement;
    if (keyboardEvent.shiftKey && (active === first || !this.host.nativeElement.contains(active))) {
      keyboardEvent.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!keyboardEvent.shiftKey && active === last) {
      keyboardEvent.preventDefault();
      first.focus({ preventScroll: true });
    }
  }

  ngOnDestroy(): void {
    document.body.style.overflow = this.previousBodyOverflow;
    if (this.returnFocus?.isConnected) {
      this.returnFocus.focus({ preventScroll: true });
    }
  }

  private focusInitialElement(): void {
    const initial = this.host.nativeElement.querySelector<HTMLElement>('[data-modal-initial-focus]');
    const target = initial ?? this.focusableElements()[0] ?? this.host.nativeElement;
    target.focus({ preventScroll: true });
  }

  private focusableElements(): HTMLElement[] {
    return Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter((element) => !element.hasAttribute('hidden') && element.offsetParent !== null);
  }
}
