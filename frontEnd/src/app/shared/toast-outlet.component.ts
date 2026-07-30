import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NotificationService } from '../core/services/notification.service';

@Component({
  selector: 'app-toast-outlet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (notifications.visible()) {
      <div
        class="app-toast"
        [class.app-toast-exit]="notifications.exiting()"
        role="status"
        aria-live="polite"
      >
        {{ notifications.message() }}
      </div>
    }
  `,
  styles: [`
    .app-toast {
      position: fixed;
      left: 50%;
      bottom: 76px;
      z-index: 350;
      transform: translateX(-50%);
      padding: 10px 14px;
      border: 1px solid var(--border);
      background: var(--chrome);
      color: var(--text-on-chrome);
      font-size: 14px;
      font-weight: 600;
      line-height: 1.3;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
      pointer-events: none;
      animation: app-toast-fade-in 0.2s ease-out forwards;
    }

    .app-toast-exit {
      animation: app-toast-fade-out 0.2s ease-in forwards;
    }

    @keyframes app-toast-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes app-toast-fade-out {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `],
})
export class ToastOutletComponent {
  readonly notifications = inject(NotificationService);
}
