import { ChangeDetectionStrategy, Component, computed, ElementRef, effect, inject, OnDestroy, signal, viewChild } from '@angular/core';
import { AudioPlaybackService } from '../core/services/audio-playback.service';
import { DistServerService } from '../core/services/dist-server.service';
import { RankedStatusService } from '../core/services/ranked-status.service';
import { SongSearchController } from '../core/services/song-search-controller.service';
import { ModalService } from '../core/services/modal.service';
import { NotificationService } from '../core/services/notification.service';
import { UserPreferencesService } from '../core/services/user-preferences.service';
import { SongTableStatsComponent } from './song-table-stats.component';
import { SongInfoModalComponent } from './song-info-modal.component';
import { collectPersonIds } from './song-table.utils';
import { hasAnnSongId, hasSongPlaybackSource, SongCredit, SongRow } from '../core/models/song';
import { PLAYLIST_TOGGLE_MESSAGES, PlaylistService } from '../playlist/playlist.service';
import { ANIME_LIST_SITES, getColumnCopyValue, getColumnDisplayValue, SONG_DIST_LINKS, SongColumnId, SongDistLink } from './song-table-columns';
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
export class SongTableComponent implements OnDestroy {
  private readonly songSearchController = inject(SongSearchController);
  private readonly table = inject(SongTableController);
  private readonly audioPlayback = inject(AudioPlaybackService);
  private readonly notifications = inject(NotificationService);
  private readonly preferences = inject(UserPreferencesService);
  private readonly rankedStatusService = inject(RankedStatusService);
  private readonly distServerService = inject(DistServerService);
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
  readonly songToAddToPlaylist = computed(() => {
    const modal = this.modalService.active();
    return modal?.type === 'playlist-picker' ? modal.song : null;
  });
  private readonly selectedPlaylistId = this.playlistService.selectedPlaylistId;
  private readonly autoAddToPlaylist = this.playlistService.autoAddEnabled;
  private readonly sortedPlaylists = this.playlistService.sortedPlaylists;
  private readonly selectedPlaylist = this.playlistService.selectedPlaylist;
  private readonly autoAddSongIds = computed(
    () => new Set(this.playlistService.autoAddPlaylist()?.annSongIds ?? []),
  );
  readonly columnSettingsArea = viewChild<ElementRef<HTMLElement>>(
    'columnSettingsArea',
  );
  readonly animeListSites = ANIME_LIST_SITES;
  readonly songDistLinks = SONG_DIST_LINKS;

  readonly sortColumn = this.table.sortColumn;
  readonly sortAscending = this.table.sortAscending;
  readonly activeSong = computed(() => {
    const modal = this.modalService.active();
    if (modal?.type !== 'song-info') return null;
    return this.songTable()?.includes(modal.song) ? modal.song : null;
  });
  private readonly draggedSong = signal<SongRow | null>(null);
  private readonly dragOverSong = signal<SongRow | null>(null);
  private readonly dragInsertAfter = signal(false);

  readonly clipboardPopup = signal<{ left: string; top: string } | null>(null);
  private clipboardPopupTimeout?: ReturnType<typeof setTimeout>;
  private readonly clipboardPopupVisibleMs = 500;

  readonly isSongPlayable = hasSongPlaybackSource;
  readonly hasAnnSongId = hasAnnSongId;

  requestAudioPlayback(song: SongRow) {
    this.audioPlayback.play(song);
  }

  openPlaylistPicker(song: SongRow): void {
    if (!hasAnnSongId(song)) return;

    const playlist = this.ensureSelectedPlaylist();
    if (this.autoAddToPlaylist() && playlist) {
      const result = this.playlistService.toggleSong(playlist.id, song.annSongId);
      const message = PLAYLIST_TOGGLE_MESSAGES[result];
      if (message) this.notifications.show(message);
      if (result === 'added' || result === 'removed' || result === 'full') return;
    }

    this.modalService.open({ type: 'playlist-picker', song });
  }

  isAlreadyInAutoAddPlaylist(song: SongRow): boolean {
    return this.autoAddSongIds().has(song.annSongId);
  }

  constructor() {
    effect(() => {
      if (this.showTableStats()) {
        this.showColumnSettings.set(false);
      }
    });

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

      if (!this.songTable()?.includes(activeModal.song)) {
        this.modalService.close(activeModal.type);
      }
    });

    effect(() => {
      this.songSearchController.searchRevision();
      this.closeSongInfoPopup();
      this.clearDragState();
    });
  }

  isColumnVisible(columnId: SongColumnId) {
    return this.table.isVisible(columnId);
  }

  getDistLink(filename: string | null | undefined) {
    return this.distServerService.getDistUrl(filename);
  }

  shouldShowSongLink(song: SongRow, link: SongDistLink) {
    return !!song[link.field];
  }

  toggleColumn(columnId: SongColumnId, visible: boolean) {
    this.table.setVisible(columnId, visible);
  }

  private ensureSelectedPlaylist() {
    const selectedPlaylist = this.selectedPlaylist();
    if (selectedPlaylist) {
      return selectedPlaylist;
    }

    const fallbackPlaylist = this.sortedPlaylists()[0] ?? null;
    if (this.selectedPlaylistId() !== fallbackPlaylist?.id) {
      this.playlistService.selectPlaylist(fallbackPlaylist?.id ?? null);
    }
    return fallbackPlaylist;
  }

  toggleColumnSettings(event: Event) {
    event.stopPropagation();
    this.showTableStats.set(false);
    this.showColumnSettings.update((open) => !open);
  }

  isCurrentAudioSong(song: SongRow) {
    return song.annSongId === this.currentAudioSong()?.annSongId;
  }

  copyToClipboard(event: MouseEvent, copytext: unknown) {
    this.clearClipboardPopupSchedule();
    this.clipboardPopup.set({
      left: `${event.clientX + 10}px`,
      top: `${event.clientY - 20}px`,
    });

    // Show copy success feedback right away instead of awaiting the Clipboard
    // promise; if the copy ends up failing, notify afterwards.
    const copyPromise = navigator.clipboard?.writeText(String(copytext ?? ''));
    if (copyPromise) {
      copyPromise.catch(() => this.notifications.show('Clipboard copy failed.'));
    } else {
      this.notifications.show('Clipboard copy failed.');
    }

    this.clipboardPopupTimeout = setTimeout(() => {
      this.clipboardPopupTimeout = undefined;
      this.clipboardPopup.set(null);
    }, this.clipboardPopupVisibleMs);
  }

  onModalCopy({ event, text }: { event: MouseEvent; text: string }) {
    this.copyToClipboard(event, text);
  }

  ngOnDestroy(): void {
    this.clearClipboardPopupSchedule();
  }

  private closeSongInfoPopup() {
    this.modalService.close('song-info');
  }

  private clearClipboardPopupSchedule(): void {
    if (this.clipboardPopupTimeout !== undefined) {
      clearTimeout(this.clipboardPopupTimeout);
      this.clipboardPopupTimeout = undefined;
    }
  }

  sortFunction(columnId: SongColumnId) {
    this.table.sort(columnId);
  }

  shuffleTable() {
    if (this.table.shuffle()) {
      this.showColumnSettings.set(false);
    }
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
    if (this.showTableStats()) {
      this.showTableStats.set(false);
    } else if (this.showColumnSettings()) {
      this.showColumnSettings.set(false);
    }
  }

  getColumnDisplayValue(song: SongRow, columnId: SongColumnId) {
    return getColumnDisplayValue(song, columnId, this.animeTitleLang());
  }

  getColumnCopyValue(song: SongRow, columnId: SongColumnId) {
    return getColumnCopyValue(song, columnId, this.animeTitleLang());
  }

  displaySongInfoPopup(song: SongRow) {
    const activeModal = this.modalService.active();
    if (activeModal?.type === 'song-info' && activeModal.song === song) {
      this.closeSongInfoPopup();
      return;
    }

    this.modalService.open({ type: 'song-info', song });
  }

  deleteRowEntry(song: SongRow) {
    const activeModal = this.modalService.active();
    if ((activeModal?.type === 'song-info' || activeModal?.type === 'playlist-picker')
      && activeModal.song === song) {
      this.modalService.close(activeModal.type);
    }

    this.table.remove(song)
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
    const moved = draggedSong
      ? this.table.move(draggedSong, targetSong, this.dragInsertAfter())
      : false;
    this.clearDragState();
    if (!moved) return;
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
