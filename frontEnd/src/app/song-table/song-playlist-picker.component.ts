import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { AppModalService } from '../modals/app-modal.service';
import { NotificationService } from '../shared/notification.service';
import { PLAYLIST_TOGGLE_MESSAGES, PlaylistService } from '../playlist/playlist.service';
import { ModalShellComponent } from '../shared/modal-shell.component';
import { hasAnnSongId, Song } from '../songs/song';
import { formatSongCount } from '../shared/number';

@Component({
  selector: 'app-song-playlist-picker',
  templateUrl: './song-playlist-picker.component.html',
  styleUrls: ['./song-playlist-picker.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalShellComponent],
})
export class SongPlaylistPickerComponent {
  readonly song = input.required<Song>();
  private readonly modals = inject(AppModalService);
  private readonly notifications = inject(NotificationService);

  readonly playlistService = inject(PlaylistService);
  readonly formatSongCount = formatSongCount;

  readonly canToggleSong = computed(
    () => !!this.playlistService.selectedPlaylist() && hasAnnSongId(this.song()),
  );
  readonly selectedPlaylistContainsSong = computed(() => {
    const playlist = this.playlistService.selectedPlaylist();
    return playlist
      ? this.playlistService.containsSong(playlist, this.song().annSongId)
      : false;
  });

  toggleSong(): void {
    const song = this.song();
    const playlist = this.playlistService.selectedPlaylist();
    if (!playlist || !hasAnnSongId(song)) return;

    const result = this.playlistService.toggleSong(playlist.id, song.annSongId);
    const message = PLAYLIST_TOGGLE_MESSAGES[result];
    if (message) this.notifications.show(message);
    if (result === 'added' || result === 'removed') this.close();
  }

  managePlaylists(): void {
    this.modals.open({ type: 'playlists' });
  }

  close(): void {
    this.modals.close('playlist-picker');
  }
}
