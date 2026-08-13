import { ChangeDetectionStrategy, Component, computed, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { AudioPlaybackService } from '../audio/audio-playback.service';
import { ClipboardService } from '../core/services/clipboard.service';
import { RankedStatusService } from '../core/services/ranked-status.service';
import { ModalService } from '../core/services/modal.service';
import { NotificationService } from '../core/services/notification.service';
import { UserPreferencesService } from '../core/services/user-preferences.service';
import { SongTableStatsComponent } from './song-table-stats.component';
import { SongInfoModalComponent } from './song-info-modal.component';
import { collectPersonIds } from './song-credits';
import { hasAnnSongId, hasSongPlaybackSource, SongCredit, SongRow } from '../core/models/song';
import { PLAYLIST_TOGGLE_MESSAGES, PlaylistService } from '../playlist/playlist.service';
import { SongSearchController } from '../search/song-search-controller.service';
import { getColumnCopyValue, getColumnDisplayValue, SongColumnDefinition } from './song-table-columns';
import { ANIME_LIST_SITES, SONG_DIST_LINKS } from './song-links';
import { SongPlaylistPickerComponent } from './song-playlist-picker.component';
import { SongTableController } from './song-table.controller';

@Component({
  selector: 'app-song-table',
  templateUrl: './song-table.component.html',
  styleUrls: ['./song-table.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onAnyClick($event)',
    '(document:keydown.escape)': 'closeOpenTablePopover()',
  },
  imports: [SongTableStatsComponent, SongInfoModalComponent, SongPlaylistPickerComponent],
})
export class SongTableComponent {
  private readonly songSearchController = inject(SongSearchController);
  readonly table = inject(SongTableController);
  readonly audioPlayback = inject(AudioPlaybackService);
  readonly clipboard = inject(ClipboardService);
  private readonly notifications = inject(NotificationService);
  readonly preferences = inject(UserPreferencesService);
  private readonly rankedStatusService = inject(RankedStatusService);
  readonly modalService = inject(ModalService);
  private readonly playlistService = inject(PlaylistService);

  readonly searchErrorMessage = this.songSearchController.searchError;
  readonly rankedActive = this.rankedStatusService.active;

  readonly songTable = this.table.songs;
  readonly animeTitleLang = computed(
    () => this.preferences.preferences().animeTitleLanguage,
  );
  readonly currentAudioSong = this.audioPlayback.currentSong;

  readonly tableHeaders = this.table.visibleColumns;
  readonly availableColumns = this.table.availableColumns;
  readonly showColumnSettings = signal(false);
  readonly showTableStats = signal(false);
  private readonly activeRowModal = computed(() => {
    const modal = this.modalService.active();
    if (modal?.type !== 'song-info' && modal?.type !== 'playlist-picker') {
      return null;
    }
    return this.songTable()?.includes(modal.song) ? modal : null;
  });
  readonly activeSong = computed(() => {
    const modal = this.activeRowModal();
    return modal?.type === 'song-info' ? modal.song : null;
  });
  readonly songToAddToPlaylist = computed(() => {
    const modal = this.activeRowModal();
    return modal?.type === 'playlist-picker' ? modal.song : null;
  });
  private readonly autoAddSongIds = computed(
    () => new Set(this.playlistService.autoAddPlaylist()?.annSongIds ?? []),
  );
  readonly columnSettingsArea = viewChild<ElementRef<HTMLElement>>(
    'columnSettingsArea',
  );
  readonly animeListSites = ANIME_LIST_SITES;
  readonly songDistLinks = SONG_DIST_LINKS;

  readonly sortState = this.table.sortState;
  private readonly draggedSong = signal<SongRow | null>(null);
  private readonly dragOverSong = signal<SongRow | null>(null);
  private readonly dragInsertAfter = signal(false);

  readonly isSongPlayable = hasSongPlaybackSource;
  readonly hasAnnSongId = hasAnnSongId;

  openPlaylistPicker(song: SongRow): void {
    if (!hasAnnSongId(song)) return;

    const playlist = this.playlistService.ensureSelectedPlaylist();
    if (this.playlistService.autoAddEnabled() && playlist) {
      const result = this.playlistService.toggleSong(playlist.id, song.annSongId);
      const message = PLAYLIST_TOGGLE_MESSAGES[result];
      if (message) this.notifications.show(message);
      return;
    }

    this.modalService.open({ type: 'playlist-picker', song });
  }

  isAlreadyInAutoAddPlaylist(song: SongRow): boolean {
    return this.autoAddSongIds().has(song.annSongId);
  }

  constructor() {
    effect(() => {
      const activeModal = this.modalService.active();
      if (activeModal) {
        this.showTableStats.set(false);
        this.showColumnSettings.set(false);
      }
    });

    effect(() => {
      const activeModal = this.modalService.active();
      if (activeModal?.type !== 'song-info' && activeModal?.type !== 'playlist-picker') {
        return;
      }

      if (!this.activeRowModal()) {
        this.modalService.close(activeModal.type);
      }
    });

    effect(() => {
      this.songSearchController.latestResult();
      this.closeSongInfoPopup();
      this.clearDragState();
    });
  }

  toggleColumnSettings(event: Event) {
    event.stopPropagation();
    this.showColumnSettings.update((open) => !open);
  }

  isCurrentAudioSong(song: SongRow) {
    return song.annSongId === this.currentAudioSong()?.annSongId;
  }

  private closeSongInfoPopup() {
    this.modalService.close('song-info');
  }

  onAnyClick(event: MouseEvent) {
    const target = event.target as Node;

    if (this.showColumnSettings()) {
      if (!this.columnSettingsArea()?.nativeElement.contains(target)) {
        this.showColumnSettings.set(false);
      }
    }
  }

  closeOpenTablePopover() {
    this.showTableStats.set(false);
    this.showColumnSettings.set(false);
  }

  getColumnDisplayValue(song: SongRow, column: SongColumnDefinition) {
    return getColumnDisplayValue(song, column, this.animeTitleLang());
  }

  getColumnCopyValue(song: SongRow, column: SongColumnDefinition) {
    return getColumnCopyValue(song, column, this.animeTitleLang());
  }

  displaySongInfoPopup(song: SongRow) {
    const activeModal = this.modalService.active();
    if (activeModal?.type === 'song-info' && activeModal.song === song) {
      this.closeSongInfoPopup();
      return;
    }

    this.modalService.open({ type: 'song-info', song });
  }

  onRowDragStart(event: DragEvent, song: SongRow) {
    this.draggedSong.set(song);
    this.dragOverSong.set(null);
    this.dragInsertAfter.set(false);
    event.stopPropagation();

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', '');
    }
  }

  onRowDragOver(event: DragEvent, song: SongRow) {
    const draggedSong = this.draggedSong();
    if (!draggedSong || draggedSong === song) {
      return;
    }

    event.preventDefault();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.dragOverSong.set(song);
    this.dragInsertAfter.set(event.clientY > rect.top + rect.height / 2);

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onRowDrop(event: DragEvent, targetSong: SongRow) {
    event.preventDefault();
    event.stopPropagation();

    const draggedSong = this.draggedSong();
    if (draggedSong) {
      this.table.move(draggedSong, targetSong, this.dragInsertAfter());
    }
    this.clearDragState();
  }

  onRowDragEnd() {
    this.clearDragState();
  }

  isDraggingSong(song: SongRow) {
    return this.draggedSong() === song;
  }

  isDragOverBefore(song: SongRow) {
    return this.dragOverSong() === song && !this.dragInsertAfter();
  }

  isDragOverAfter(song: SongRow) {
    return this.dragOverSong() === song && this.dragInsertAfter();
  }

  private clearDragState() {
    this.draggedSong.set(null);
    this.dragOverSong.set(null);
    this.dragInsertAfter.set(false);
  }

  searchArtistIds(artists: SongCredit[]): void {
    this.songSearchController.searchArtistIds(collectPersonIds(artists));
  }

  searchComposerIds(composers: SongCredit[]): void {
    this.songSearchController.searchComposerIds(collectPersonIds(composers));
  }

  searchAnnId(id: string | number): void {
    this.songSearchController.searchAnnIds([id]);
  }
}
