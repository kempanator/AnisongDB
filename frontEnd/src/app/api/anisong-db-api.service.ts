import { effect, inject, Injectable, Injector, untracked } from '@angular/core';
import { AudioPlaybackService } from '../audio/audio-playback.service';
import { AppStorageService } from '../core/services/app-storage.service';
import { ModalService } from '../core/services/modal.service';
import { NotificationService } from '../core/services/notification.service';
import { RankedStatusService } from '../core/services/ranked-status.service';
import { UserPreferencesService } from '../core/services/user-preferences.service';
import { PlaylistService } from '../playlist/playlist.service';
import { SongSearchController } from '../search/song-search-controller.service';
import { SettingsTabRegistryService } from '../settings/settings-tab-registry.service';
import { SongTableController } from '../song-table/song-table.controller';

/**
 * Publishes a deliberately thin userscript bridge over raw Angular services.
 */
@Injectable({ providedIn: 'root' })
export class AnisongDBApiService {
  private readonly injector = inject(Injector);

  private readonly services = Object.freeze({
    playback: inject(AudioPlaybackService),
    modals: inject(ModalService),
    notifications: inject(NotificationService),
    playlists: inject(PlaylistService),
    preferences: inject(UserPreferencesService),
    rankedStatus: inject(RankedStatusService),
    searches: inject(SongSearchController),
    settingsTabs: inject(SettingsTabRegistryService),
    storage: inject(AppStorageService),
    table: inject(SongTableController),
  });

  readonly api = Object.freeze({
    services: this.services,
    watch: <T>(
      read: () => T,
      listener: (value: T) => void,
    ) => this.watch(read, listener),
  });

  private watch<T>(
    read: () => T,
    listener: (value: T) => void,
  ): () => void {
    const watcher = effect(() => {
      const value = read();
      untracked(() => {
        try {
          listener(value);
        } catch (error) {
          console.error('An AnisongDB userscript watcher failed.', error);
        }
      });
    }, { injector: this.injector });

    return () => watcher.destroy();
  }
}

declare global {
  interface Window {
    AnisongDB?: AnisongDBApiService['api'];
  }
}
