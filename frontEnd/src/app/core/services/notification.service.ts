import { DestroyRef, inject, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly visibleMs = 2000;
  private readonly fadeMs = 200;
  private visibleTimeout?: ReturnType<typeof setTimeout>;
  private fadeTimeout?: ReturnType<typeof setTimeout>;

  readonly message = signal('');
  readonly visible = signal(false);
  readonly exiting = signal(false);

  constructor() {
    this.destroyRef.onDestroy(() => this.clearTimers());
  }

  show(message: string): void {
    this.clearTimers();
    this.message.set(message);
    this.exiting.set(false);
    this.visible.set(true);

    this.visibleTimeout = setTimeout(() => {
      this.exiting.set(true);
      this.fadeTimeout = setTimeout(() => {
        this.visible.set(false);
        this.exiting.set(false);
      }, this.fadeMs);
    }, this.visibleMs);
  }

  private clearTimers(): void {
    if (this.visibleTimeout) {
      clearTimeout(this.visibleTimeout);
      this.visibleTimeout = undefined;
    }
    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
      this.fadeTimeout = undefined;
    }
  }
}
