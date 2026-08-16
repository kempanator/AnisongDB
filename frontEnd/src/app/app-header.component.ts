import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AppModalService } from './modals/app-modal.service';
import type { AnimeTitleLanguage } from './settings/user-preferences';
import { UserPreferencesService } from './settings/user-preferences.service';

@Component({
  selector: 'app-header',
  templateUrl: './app-header.component.html',
  styleUrls: ['./app-header.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppHeaderComponent {
  private readonly userPreferencesService = inject(UserPreferencesService);
  readonly modals = inject(AppModalService);
  readonly preferences = this.userPreferencesService.preferences;
  readonly animeTitleLang = computed(() => this.preferences().animeTitleLanguage);

  toggleAnimeLang(): void {
    const animeTitleLanguage: AnimeTitleLanguage =
      this.animeTitleLang() === 'JP' ? 'EN' : 'JP';
    this.userPreferencesService.updatePreferences({ animeTitleLanguage });
  }
}
