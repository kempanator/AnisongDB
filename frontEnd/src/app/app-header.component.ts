import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { AnimeTitleLanguage, UserPreferencesService } from './core/services/user-preferences.service';

@Component({
  selector: 'app-header',
  templateUrl: './app-header.component.html',
  styleUrls: ['./app-header.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppHeaderComponent {
  private readonly userPreferencesService = inject(UserPreferencesService);
  readonly preferences = this.userPreferencesService.preferences;
  readonly animeTitleLang = computed(() => this.preferences().animeTitleLanguage);
  readonly playlistsRequested = output<void>();
  readonly settingsRequested = output<void>();

  toggleAnimeLang(): void {
    const animeTitleLanguage: AnimeTitleLanguage =
      this.animeTitleLang() === 'JP' ? 'EN' : 'JP';
    this.userPreferencesService.updatePreferences({ animeTitleLanguage });
  }
}
