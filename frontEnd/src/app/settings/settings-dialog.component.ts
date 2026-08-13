import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  ANIME_TITLE_LANGUAGE_OPTIONS,
  DIST_SERVER_OPTIONS,
  RADIO_MODE_OPTIONS,
  THEME_OPTIONS,
} from '../core/models/user-preferences';
import { AppStorageService } from '../core/services/app-storage.service';
import { ModalService } from '../core/services/modal.service';
import { NotificationService } from '../core/services/notification.service';
import { UserPreferencesService } from '../core/services/user-preferences.service';
import { ModalShellComponent } from '../shared/modal-shell.component';
import { AppDataBackupService } from './app-data-backup.service';
import {
  SettingsTabPanelDirective,
  SettingsTabRegistryService,
} from './settings-tab-registry.service';

@Component({
  selector: 'app-settings-dialog',
  imports: [ModalShellComponent, SettingsTabPanelDirective],
  templateUrl: './settings-dialog.component.html',
  styleUrls: ['./settings-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsDialogComponent {
  readonly modals = inject(ModalService);
  readonly settingsTabRegistry = inject(SettingsTabRegistryService);
  readonly activeTab = this.settingsTabRegistry.activeTab;
  readonly userPreferencesService = inject(UserPreferencesService);
  private readonly storage = inject(AppStorageService);
  private readonly backup = inject(AppDataBackupService);
  private readonly notifications = inject(NotificationService);

  readonly preferences = this.userPreferencesService.preferences;
  readonly animeTitleLanguages = ANIME_TITLE_LANGUAGE_OPTIONS;
  readonly themes = THEME_OPTIONS;
  readonly distServers = DIST_SERVER_OPTIONS;
  readonly radioModes = RADIO_MODE_OPTIONS;

  constructor() {
    this.settingsTabRegistry.resetActiveTab();
  }

  setTab(tab: string): void {
    this.settingsTabRegistry.setActiveTab(tab);
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

  exportAppData(): void {
    this.backup.exportAll();
    this.notifications.show('App data exported');
  }

  onAppDataImport(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) void this.importAppData(file);
  }

  resetSettings(): void {
    if (!window.confirm('This will reset all AnisongDB settings, playlists, and saved site data. Continue?')) return;

    if (!this.storage.clear()) {
      this.notifications.show('Could not reset app data');
      return;
    }
    window.location.reload();
  }

  private async importAppData(file: File): Promise<void> {
    try {
      const values = await this.backup.readFile(file);
      if (!values) {
        this.notifications.show('That is not a valid app data backup');
        return;
      }
      if (!window.confirm('Importing this backup will replace all current settings and playlists. Continue?')) return;
      if (!this.storage.replaceAll(values)) {
        this.notifications.show('Could not import app data');
        return;
      }
      window.location.reload();
    } catch {
      this.notifications.show('Could not read that app data file');
    }
  }
}
