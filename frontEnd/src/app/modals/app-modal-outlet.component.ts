import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { PlaylistDialogComponent } from '../playlist/playlist-dialog.component';
import { SettingsDialogComponent } from '../settings/settings-dialog.component';
import { ClipboardPopupOutletComponent } from '../shared/clipboard-popup-outlet.component';
import { SongWorkspaceStore } from '../songs/song-workspace.store';
import { SongInfoModalComponent } from '../song-table/song-info-modal.component';
import { SongPlaylistPickerComponent } from '../song-table/song-playlist-picker.component';
import { AppModalService } from './app-modal.service';

@Component({
  selector: 'app-modal-outlet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ClipboardPopupOutletComponent,
    PlaylistDialogComponent,
    SettingsDialogComponent,
    SongInfoModalComponent,
    SongPlaylistPickerComponent,
  ],
  template: `
    @if (!activeModal()) {
      <app-clipboard-popup-outlet />
    }

    @switch (activeModal()?.type) {
      @case ('settings') {
        <app-settings-dialog />
      }
      @case ('playlists') {
        <app-playlist-dialog />
      }
      @case ('song-info') {
        @if (activeSong(); as song) {
          <app-song-info-modal [song]="song" />
        }
      }
      @case ('playlist-picker') {
        @if (activeSong(); as song) {
          <app-song-playlist-picker [song]="song" />
        }
      }
    }
  `,
})
export class AppModalOutletComponent {
  private readonly modals = inject(AppModalService);
  private readonly workspace = inject(SongWorkspaceStore);

  readonly activeModal = this.modals.active;
  readonly activeSong = computed(() => {
    const modal = this.activeModal();
    if (modal?.type !== 'song-info' && modal?.type !== 'playlist-picker') {
      return null;
    }
    return this.workspace.songs()?.includes(modal.song) ? modal.song : null;
  });

  constructor() {
    effect(() => {
      const modal = this.activeModal();
      if (
        (modal?.type === 'song-info' || modal?.type === 'playlist-picker')
        && !this.activeSong()
      ) {
        this.modals.close(modal.type);
      }
    });
  }
}
