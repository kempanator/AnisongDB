import { effect, inject, Injectable, Injector, untracked } from '@angular/core';
import { AudioPlaybackService } from '../core/services/audio-playback.service';
import { DistServerService } from '../core/services/dist-server.service';
import { ModalService } from '../core/services/modal.service';
import { NotificationService } from '../core/services/notification.service';
import { RankedStatusService } from '../core/services/ranked-status.service';
import { SongSearchController } from '../core/services/song-search-controller.service';
import { ThemeService } from '../core/services/theme.service';
import { UserPreferencesService } from '../core/services/user-preferences.service';
import { PlaylistService } from '../playlist/playlist.service';
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
    distServers: inject(DistServerService),
    modals: inject(ModalService),
    notifications: inject(NotificationService),
    playlists: inject(PlaylistService),
    preferences: inject(UserPreferencesService),
    rankedStatus: inject(RankedStatusService),
    searches: inject(SongSearchController),
    settingsTabs: inject(SettingsTabRegistryService),
    table: inject(SongTableController),
    themes: inject(ThemeService),
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
