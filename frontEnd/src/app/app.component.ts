import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { AppHeaderComponent } from './app-header.component';
import { AudioPlayerComponent } from './audio-player.component';
import { AudioPlaybackService } from './core/services/audio-playback.service';
import { NotificationService } from './core/services/notification.service';
import { formatSongCount, SongRow } from './core/models/song';
import { SongSearchController } from './core/services/song-search-controller.service';
import { UserPreferencesService } from './core/services/user-preferences.service';
import { PlaylistDialogComponent } from './playlist/playlist-dialog.component';
import { SearchBarComponent } from './search-bar/search-bar.component';
import { SettingsDialogComponent } from './settings/settings-dialog.component';
import { ToastOutletComponent } from './shared/toast-outlet.component';
import { SongTableComponent } from './song-table/song-table.component';

type AppModal = 'settings' | 'playlists' | null;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onDocumentKeydown($event)' },
  imports: [
    AppHeaderComponent,
    AudioPlayerComponent,
    PlaylistDialogComponent,
    SearchBarComponent,
    SettingsDialogComponent,
    SongTableComponent,
    ToastOutletComponent,
  ],
})
export class AppComponent {
  readonly songSearchController = inject(SongSearchController);
  readonly audioPlayback = inject(AudioPlaybackService);
  readonly activeModal = signal<AppModal>(null);
  private readonly preferencesService = inject(UserPreferencesService);
  private readonly notifications = inject(NotificationService);

  readonly preferences = this.preferencesService.preferences;
  readonly animeTitleLang = computed(() => this.preferences().animeTitleLanguage);

  constructor() {
    effect(() => {
      const result = this.songSearchController.playlistLoadResult();
      if (!result) return;
      const { requestedCount, loadedCount, source } = result;
      if (loadedCount < requestedCount) {
        this.notifications.show(`Loaded ${loadedCount} of ${requestedCount} songs.`);
      } else if (source === 'import') {
        this.notifications.show(`Loaded ${formatSongCount(loadedCount)} into the table.`);
      }
    });
  }

  openModal(modal: Exclude<AppModal, null>): void {
    this.activeModal.set(modal);
  }

  closeModal(): void {
    this.activeModal.set(null);
  }

  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.activeModal()) {
      event.preventDefault();
      this.closeModal();
    }
  }

  updateSongList(songs: SongRow[]): void {
    this.songSearchController.replaceSongList(songs);
  }

  showNotification(message: string): void {
    this.notifications.show(message);
  }
}
