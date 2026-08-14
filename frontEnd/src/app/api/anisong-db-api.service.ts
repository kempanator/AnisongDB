import { effect, inject, Injectable, Injector, untracked } from '@angular/core';
import { AudioPlaybackService } from '../audio/audio-playback.service';
import { AppStorageService } from '../core/app-storage.service';
import { AppModalService } from '../modals/app-modal.service';
import { NotificationService } from '../shared/notification.service';
import { RankedStatusService } from '../shared/ranked-status.service';
import { UserPreferencesService } from '../settings/user-preferences.service';
import { PlaylistService } from '../playlist/playlist.service';
import { SongSearchController } from '../search/song-search-controller.service';
import { SettingsTabRegistryService } from '../settings/settings-tab-registry.service';
import { SongWorkspaceStore } from '../songs/song-workspace.store';
import { SongTableController } from '../song-table/song-table.controller';

/**
 * Publishes a deliberately thin userscript bridge over raw Angular services.
 */
@Injectable({ providedIn: 'root' })
export class AnisongDBApiService {
  private readonly injector = inject(Injector);

  private readonly services = Object.freeze({
    playback: inject(AudioPlaybackService),
    modals: inject(AppModalService),
    notifications: inject(NotificationService),
    playlists: inject(PlaylistService),
    preferences: inject(UserPreferencesService),
    rankedStatus: inject(RankedStatusService),
    searches: inject(SongSearchController),
    settingsTabs: inject(SettingsTabRegistryService),
    storage: inject(AppStorageService),
    table: inject(SongTableController),
    workspace: inject(SongWorkspaceStore),
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
