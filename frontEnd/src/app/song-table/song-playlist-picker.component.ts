import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import {
  PLAYLIST_TOGGLE_MESSAGES,
  PlaylistService,
} from '../playlist/playlist.service';
import { ModalFocusTrapDirective } from '../shared/modal-focus-trap.directive';
import { formatSongCount, hasAnnSongId, SongRow } from '../core/models/song';

@Component({
  selector: 'app-song-playlist-picker',
  templateUrl: './song-playlist-picker.component.html',
  styleUrls: ['./song-playlist-picker.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalFocusTrapDirective],
})
export class SongPlaylistPickerComponent {
  readonly song = input.required<SongRow>();
  readonly closed = output<void>();
  readonly managePlaylistsRequested = output<void>();
  readonly notificationRequested = output<string>();

  readonly playlistService = inject(PlaylistService);
  readonly selectedPlaylistId = this.playlistService.selectedPlaylistId;
  readonly autoAddToPlaylist = this.playlistService.autoAddEnabled;
  readonly sortedPlaylists = this.playlistService.sortedPlaylists;
  readonly selectedPlaylist = this.playlistService.selectedPlaylist;
  readonly formatSongCount = formatSongCount;

  selectPlaylist(playlistId: string): void {
    this.playlistService.selectPlaylist(playlistId);
  }

  setAutoAddToPlaylist(enabled: boolean): void {
    this.playlistService.setAutoAdd(enabled);
  }

  canToggleSong(): boolean {
    return !!this.selectedPlaylist() && hasAnnSongId(this.song());
  }

  selectedPlaylistContainsSong(): boolean {
    const playlist = this.selectedPlaylist();
    return playlist
      ? this.playlistService.containsSong(playlist, this.song().annSongId)
      : false;
  }

  toggleSong(): void {
    const song = this.song();
    const playlist = this.selectedPlaylist();
    if (!playlist || !hasAnnSongId(song)) return;

    const result = this.playlistService.toggleSong(playlist.id, song.annSongId);
    const message = PLAYLIST_TOGGLE_MESSAGES[result];
    if (message) this.notificationRequested.emit(message);
    if (result === 'added' || result === 'removed') this.closed.emit();
  }

  managePlaylists(): void {
    this.closed.emit();
    this.managePlaylistsRequested.emit();
  }
}
