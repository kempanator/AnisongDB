import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ModalFocusTrapDirective } from './modal-focus-trap.directive';

@Component({
  selector: 'app-modal-shell',
  imports: [ModalFocusTrapDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      [id]="dialogId()"
      class="app-modal-backdrop modal-shell-backdrop"
      role="dialog"
      aria-modal="true"
      [attr.aria-labelledby]="titleId()"
      (click)="closed.emit()"
    >
      <div
        class="app-modal-surface modal-shell-content"
        appModalFocusTrap
        tabindex="-1"
        (click)="$event.stopPropagation()"
      >
        <div class="app-modal-header modal-shell-header">
          <h2 [id]="titleId()">{{ modalTitle() }}</h2>
          <button
            [id]="closeButtonId()"
            type="button"
            class="app-icon-button app-modal-close"
            data-modal-initial-focus
            title="Close"
            [attr.aria-label]="closeLabel()"
            (click)="closed.emit()"
          >
            <i class="fa fa-times" aria-hidden="true"></i>
          </button>
        </div>
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styleUrls: ['./modal-shell.component.css'],
})
export class ModalShellComponent {
  readonly modalTitle = input.required<string>();
  readonly titleId = input.required<string>();
  readonly closeLabel = input('Close dialog');
  readonly dialogId = input<string>();
  readonly closeButtonId = input<string>();
  readonly closed = output<void>();
}
