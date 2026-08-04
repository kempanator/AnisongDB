import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { DistServerService } from '../core/services/dist-server.service';
import { NotificationService } from '../core/services/notification.service';
import { ThemeService } from '../core/services/theme.service';
import { RadioMode, UserPreferencesService } from '../core/services/user-preferences.service';
import { ModalShellComponent } from '../shared/modal-shell.component';
import { PreferencesBackupService } from './preferences-backup.service';
import { SettingsTabPanelDirective } from './settings-tab-panel.directive';
import { SettingsTabRegistryService } from './settings-tab-registry.service';

@Component({
  selector: 'app-settings-dialog',
  imports: [ModalShellComponent, SettingsTabPanelDirective],
  templateUrl: './settings-dialog.component.html',
  styleUrls: ['./settings-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsDialogComponent {
  readonly closed = output<void>();
  readonly settingsTabRegistry = inject(SettingsTabRegistryService);
  readonly activeTab = this.settingsTabRegistry.activeTab;
  readonly userPreferencesService = inject(UserPreferencesService);
  readonly themeService = inject(ThemeService);
  readonly distServerService = inject(DistServerService);
  private readonly backup = inject(PreferencesBackupService);
  private readonly notifications = inject(NotificationService);

  readonly preferences = this.userPreferencesService.preferences;
  readonly animeTitleLang = computed(() => this.preferences().animeTitleLanguage);
  readonly radioModes: ReadonlyArray<{ id: RadioMode; label: string }> = [
    { id: 'none', label: 'None' },
    { id: 'repeat', label: 'Repeat' },
    { id: 'loop-all', label: 'Loop all' },
  ];

  constructor() {
    this.settingsTabRegistry.resetActiveTab();
  }

  setTab(tab: string): void {
    this.settingsTabRegistry.setActiveTab(tab);
  }

  setRadioMode(radioMode: RadioMode): void {
    this.userPreferencesService.updatePreferences({ radioMode });
  }

  onTabKeydown(event: KeyboardEvent): void {
    const tabs = this.settingsTabRegistry.tabs();
    const current = tabs.findIndex((tab) => tab.id === this.activeTab());
    let next = current;
    if (event.key === 'ArrowRight') next = (current + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    this.setTab(tabs[next].id);
    document.getElementById(`settings-tab-${tabs[next].id}`)?.focus();
  }

  exportPreferences(): void {
    this.backup.exportAll();
    this.notifications.show('Preferences exported');
  }

  onPreferencesImport(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) void this.importPreferences(file);
  }

  resetSettings(): void {
    if (!window.confirm('This will reset all AnisongDB settings, playlists, and saved site data. Continue?')) return;

    this.userPreferencesService.clearStoredPreferences();
    window.location.reload();
  }

  private async importPreferences(file: File): Promise<void> {
    try {
      const values = await this.backup.readFile(file);
      if (!values) {
        this.notifications.show('That is not a valid preferences backup');
        return;
      }
      if (!window.confirm('Importing this backup will replace all current settings and playlists. Continue?')) return;
      if (!this.backup.replaceAll(values)) {
        this.notifications.show('Could not import preferences');
        return;
      }
      window.location.reload();
    } catch {
      this.notifications.show('Could not read that preferences file');
    }
  }
}
