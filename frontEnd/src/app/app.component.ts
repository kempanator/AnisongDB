import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { AppHeaderComponent } from './app-header.component';
import { AudioPlayerComponent } from './audio-player.component';
import { ModalService } from './core/services/modal.service';
import { NotificationService } from './core/services/notification.service';
import { formatSongCount } from './core/models/song';
import { SongSearchController } from './core/services/song-search-controller.service';
import { PlaylistDialogComponent } from './playlist/playlist-dialog.component';
import { SearchBarComponent } from './search-bar/search-bar.component';
import { SettingsDialogComponent } from './settings/settings-dialog.component';
import { ToastOutletComponent } from './shared/toast-outlet.component';
import { SongTableComponent } from './song-table/song-table.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  private readonly songSearchController = inject(SongSearchController);
  readonly modalService = inject(ModalService);
  readonly activeModal = this.modalService.active;
  private readonly notifications = inject(NotificationService);

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

  openModal(type: 'settings' | 'playlists'): void {
    this.modalService.open({ type });
  }

  closeModal(type: 'settings' | 'playlists'): void {
    this.modalService.close(type);
  }

}
