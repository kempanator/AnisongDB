import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { ANIME_TITLE_LANGUAGE_OPTIONS, DIST_SERVER_OPTIONS, RADIO_MODE_OPTIONS, THEME_OPTIONS } from './user-preferences';
import { AppStorageService, type StoredAppData } from '../core/app-storage.service';
import { AppModalService } from '../modals/app-modal.service';
import { downloadJsonFile, readJsonFile } from '../shared/json-file';
import { NotificationService } from '../shared/notification.service';
import { UserPreferencesService } from './user-preferences.service';
import { ModalShellComponent } from '../shared/modal-shell.component';
import { SettingsTabPanelDirective } from './settings-tab-panel.directive';
import { SettingsTabRegistryService } from './settings-tab-registry.service';

interface AppDataBackup {
  format: 'anisongdb-app-data';
  exportedAt: string;
  data: StoredAppData;
}

@Component({
  selector: 'app-settings-dialog',
  imports: [ModalShellComponent, SettingsTabPanelDirective],
  templateUrl: './settings-dialog.component.html',
  styleUrls: ['./settings-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsDialogComponent {
  readonly modals = inject(AppModalService);
  readonly settingsTabRegistry = inject(SettingsTabRegistryService);
  readonly activeTab = signal<string>('settings');
  readonly userPreferencesService = inject(UserPreferencesService);
  private readonly storage = inject(AppStorageService);
  private readonly notifications = inject(NotificationService);

  readonly preferences = this.userPreferencesService.preferences;
  readonly animeTitleLanguages = ANIME_TITLE_LANGUAGE_OPTIONS;
  readonly themes = THEME_OPTIONS;
  readonly distServers = DIST_SERVER_OPTIONS;
  readonly radioModes = RADIO_MODE_OPTIONS;

  constructor() {
    effect(() => {
      if (!this.settingsTabRegistry.tabs().some((tab) => tab.id === this.activeTab())) {
        this.activeTab.set('settings');
      }
    });
  }

  setTab(tab: string): void {
    if (this.settingsTabRegistry.tabs().some((candidate) => candidate.id === tab)) {
      this.activeTab.set(tab);
    }
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
    const backup: AppDataBackup = {
      format: 'anisongdb-app-data',
      exportedAt: new Date().toISOString(),
      data: this.storage.readAll(),
    };
    downloadJsonFile(
      `anisongdb-data-${backup.exportedAt.slice(0, 10)}.json`,
      backup,
      2,
    );
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
      const values = parseAppDataBackup(await readJsonFile(file));
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

function parseAppDataBackup(value: unknown): StoredAppData | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const candidate = value as Partial<AppDataBackup>;
  if (
    candidate.format !== 'anisongdb-app-data'
    || !candidate.data
    || typeof candidate.data !== 'object'
    || Array.isArray(candidate.data)
  ) return null;

  return candidate.data;
}
