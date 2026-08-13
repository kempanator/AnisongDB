import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ModalService } from './core/services/modal.service';
import type { AnimeTitleLanguage } from './core/models/user-preferences';
import { UserPreferencesService } from './core/services/user-preferences.service';

@Component({
  selector: 'app-header',
  templateUrl: './app-header.component.html',
  styleUrls: ['./app-header.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppHeaderComponent {
  private readonly userPreferencesService = inject(UserPreferencesService);
  readonly modals = inject(ModalService);
  readonly preferences = this.userPreferencesService.preferences;
  readonly animeTitleLang = computed(() => this.preferences().animeTitleLanguage);

  toggleAnimeLang(): void {
    const animeTitleLanguage: AnimeTitleLanguage =
      this.animeTitleLang() === 'JP' ? 'EN' : 'JP';
    this.userPreferencesService.updatePreferences({ animeTitleLanguage });
  }
}
