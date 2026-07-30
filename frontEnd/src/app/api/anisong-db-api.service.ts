import { inject, Injectable } from '@angular/core';
import { SearchCommand } from '../core/models/search';
import { SongRow } from '../core/models/song';
import { AudioPlaybackService, AudioPlaybackState } from '../core/services/audio-playback.service';
import { SongSearchController } from '../core/services/song-search-controller.service';
import {
  SettingsTabCleanup,
  SettingsTabDefinition,
  SettingsTabRegistryService,
} from '../settings/settings-tab-registry.service';

export interface AnisongDBSettingsApi {
  registerTab(definition: SettingsTabDefinition): SettingsTabCleanup;
}

export interface AnisongDBSearchState {
  readonly results: readonly SongRow[] | null;
  readonly error: string | null;
  readonly revision: number;
}

export interface AnisongDBSearchApi {
  /**
   * Runs the same search pipeline used by the UI and replaces the table results.
   * Returns false only when an identical request is already in flight.
   */
  run(command: SearchCommand): boolean;
  getState(): AnisongDBSearchState;
}

export interface AnisongDBAudioApi {
  play(song: SongRow): void;
  pause(): void;
  seek(time: number): boolean;
  next(): boolean;
  previous(): boolean;
  stop(): void;
  getState(): AudioPlaybackState;
}

export interface AnisongDBGlobal {
  settings?: AnisongDBSettingsApi;
  search?: AnisongDBSearchApi;
  audio?: AnisongDBAudioApi;
}

declare global {
  interface Window {
    AnisongDB?: AnisongDBGlobal;
  }
}

/**
 * Owns the browser API exposed to userscripts. Feature services remain unaware
 * of window globals; this adapter is the single place that publishes them.
 */
@Injectable({ providedIn: 'root' })
export class AnisongDBApiService {
  private readonly settingsTabs = inject(SettingsTabRegistryService);
  private readonly searches = inject(SongSearchController);
  private readonly playback = inject(AudioPlaybackService);

  constructor() {
    this.installWindowApi();
  }

  private installWindowApi(): void {
    if (typeof window === 'undefined') return;

    const existing = window.AnisongDB ?? {};
    window.AnisongDB = {
      ...existing,
      settings: {
        ...existing.settings,
        registerTab: (definition) => this.settingsTabs.registerTab(definition),
      },
      search: {
        ...existing.search,
        run: (command) => this.searches.runSearch(command),
        getState: () => {
          const results = this.searches.songList();
          return {
            results: results ? [...results] : null,
            error: this.searches.searchError(),
            revision: this.searches.searchRevision(),
          };
        },
      },
      audio: {
        ...existing.audio,
        play: (song) => this.playback.play(song),
        pause: () => this.playback.pause(),
        seek: (time) => this.playback.seek(time),
        next: () => this.playback.next(),
        previous: () => this.playback.previous(),
        stop: () => this.playback.stop(),
        getState: () => this.playback.state(),
      },
    };
  }
}
