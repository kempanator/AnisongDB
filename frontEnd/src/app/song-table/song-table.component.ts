import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  effect,
  inject,
  input,
  OnDestroy,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { DistServerService } from '../core/services/dist-server.service';
import { RankedStatusService } from '../core/services/ranked-status.service';
import { SongSearchController } from '../core/services/song-search-controller.service';
import { ModalService } from '../core/services/modal.service';
import { AnimeTitleLanguage } from '../core/services/user-preferences.service';
import { SongTableStatsComponent } from './song-table-stats.component';
import { SongInfoModalComponent } from './song-info-modal.component';
import { collectPersonIds, computeTableStats } from './song-table.utils';
import { SongRow } from './song-table.types';
import { hasAnnSongId, hasSongPlaybackSource, SongCredit } from '../core/models/song';
import {
  PLAYLIST_TOGGLE_MESSAGES,
  PlaylistService,
} from '../playlist/playlist.service';
import { SongTableSettingsService } from './song-table-settings.service';
import {
  ANIME_LIST_SITES,
  getColumnCopyValue,
  getColumnDisplayValue,
  SONG_DIST_LINKS,
  SongColumnId,
  SongDistLink,
} from './song-table-columns';
import {
  moveSongInTable,
  removeSongFromTable,
  shuffleSongTable,
  sortSongTable,
} from './song-table-ordering';
import { SongPlaylistPickerComponent } from './song-playlist-picker.component';

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
  private readonly rankedStatusService = inject(RankedStatusService);
  private readonly distServerService = inject(DistServerService);
  readonly modalService = inject(ModalService);
  readonly playlistService = inject(PlaylistService);
  private readonly tableSettings = inject(SongTableSettingsService);

  readonly searchErrorMessage = this.songSearchController.searchError;
  readonly rankedActive = this.rankedStatusService.active;

  readonly songTable = input<SongRow[] | null | undefined>();
  readonly animeTitleLang = input<AnimeTitleLanguage>('JP');
  readonly showAmqSongId = input(false);
  readonly currentAudioSong = input<SongRow | null>(null);
  readonly searchRevision = input(0);
  readonly resultOrder = input<'default' | 'playlist'>('default');
  readonly playAudioRequested = output<SongRow>();
  readonly songTableChange = output<SongRow[]>();
  readonly managePlaylistsRequested = output<void>();
  readonly notificationRequested = output<string>();

  readonly tableHeaders = this.tableSettings.visibleColumns;
  readonly availableColumns = this.tableSettings.availableColumns;
  readonly showColumnSettings = signal(false);
  readonly showTableStats = signal(false);
  readonly songToAddToPlaylist = computed(() => {
    const modal = this.modalService.active();
    return modal?.type === 'playlist-picker' ? modal.song : null;
  });
  readonly selectedPlaylistId = this.playlistService.selectedPlaylistId;
  readonly autoAddToPlaylist = this.playlistService.autoAddEnabled;
  readonly sortedPlaylists = this.playlistService.sortedPlaylists;
  readonly selectedPlaylist = this.playlistService.selectedPlaylist;
  private readonly autoAddSongIds = computed(
    () => new Set(this.playlistService.autoAddPlaylist()?.annSongIds ?? []),
  );
  readonly columnSettingsArea = viewChild<ElementRef<HTMLElement>>(
    'columnSettingsArea',
  );
  readonly animeListSites = ANIME_LIST_SITES;
  readonly songDistLinks = SONG_DIST_LINKS;

  readonly sortColumn = signal<SongColumnId | null>(null);
  readonly sortAscending = signal(false);
  readonly activeSong = computed(() => {
    const modal = this.modalService.active();
    if (modal?.type !== 'song-info') return null;
    return this.songTable()?.includes(modal.song) ? modal.song : null;
  });
  readonly activeSongIndex = computed(() => {
    const song = this.activeSong();
    return song ? (this.songTable()?.indexOf(song) ?? -1) : -1;
  });
  private readonly draggedSong = signal<SongRow | null>(null);
  private readonly dragOverSong = signal<SongRow | null>(null);
  private readonly dragInsertAfter = signal(false);

  readonly tableStats = computed(() => computeTableStats(this.songTable(), this.animeTitleLang()));

  readonly clipboardPopup = signal<{ left: string; top: string } | null>(null);
  private clipboardPopupTimeout?: ReturnType<typeof setTimeout>;
  private readonly clipboardPopupVisibleMs = 500;

  readonly isSongPlayable = hasSongPlaybackSource;
  readonly hasAnnSongId = hasAnnSongId;

  requestAudioPlayback(song: SongRow) {
    this.playAudioRequested.emit(song);
  }

  openPlaylistPicker(song: SongRow): void {
    if (!hasAnnSongId(song)) return;

    const playlist = this.ensureSelectedPlaylist();
    if (this.autoAddToPlaylist() && playlist) {
      const result = this.playlistService.toggleSong(playlist.id, song.annSongId);
      const message = PLAYLIST_TOGGLE_MESSAGES[result];
      if (message) this.notificationRequested.emit(message);
      if (result === 'added' || result === 'removed' || result === 'full') return;
    }

    this.modalService.open({ type: 'playlist-picker', song });
  }

  isAlreadyInAutoAddPlaylist(song: SongRow): boolean {
    return this.autoAddSongIds().has(song.annSongId);
  }

  closePlaylistPicker(): void {
    this.modalService.close('playlist-picker');
  }

  constructor() {
    let previousAnimeTitleLang = this.animeTitleLang();

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
      this.searchRevision();
      if (this.resultOrder() === 'playlist') {
        this.clearSortState();
      } else {
        this.resetSortStateForNewSearch();
      }
      this.closeSongInfoPopup();
      this.clearDragState();
    });

    effect(() => {
      const animeTitleLang = this.animeTitleLang();
      const languageChanged = animeTitleLang !== previousAnimeTitleLang;
      previousAnimeTitleLang = animeTitleLang;

      if (languageChanged && untracked(this.sortColumn) === 'anime') {
        this.clearSortState();
      }
    });
  }

  isColumnVisible(columnId: SongColumnId) {
    return this.tableSettings.isVisible(columnId);
  }

  isColumnSortable(columnId: SongColumnId) {
    return this.availableColumns.find((column) => column.id === columnId)?.sortable ?? false;
  }

  getDistLink(filename: string | null | undefined) {
    return this.distServerService.getDistUrl(filename);
  }

  shouldShowSongLink(song: SongRow, link: SongDistLink) {
    return !!song[link.field];
  }

  toggleColumn(columnId: SongColumnId, visible: boolean) {
    this.tableSettings.setVisible(columnId, visible);
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
      copyPromise.catch(() => this.notificationRequested.emit('Clipboard copy failed.'));
    } else {
      this.notificationRequested.emit('Clipboard copy failed.');
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

  closeSongInfoPopup() {
    this.modalService.close('song-info');
  }

  private clearClipboardPopupSchedule(): void {
    if (this.clipboardPopupTimeout !== undefined) {
      clearTimeout(this.clipboardPopupTimeout);
      this.clipboardPopupTimeout = undefined;
    }
  }

  private resetSortStateForNewSearch() {
    this.sortColumn.set('annId');
    this.sortAscending.set(true);
  }

  private clearSortState() {
    this.sortColumn.set(null);
    this.sortAscending.set(false);
  }

  sortFunction(columnId: SongColumnId) {
    const table = this.songTable();
    if (!table || !this.isColumnSortable(columnId)) {
      return;
    }

    const ascending = this.sortColumn() === columnId ? !this.sortAscending() : true;
    this.sortColumn.set(columnId);
    this.sortAscending.set(ascending);
    this.songTableChange.emit(sortSongTable(table, columnId, ascending, this.animeTitleLang()));
  }

  shuffleTable() {
    const table = this.songTable();
    if (!table || table.length < 2) {
      return;
    }

    this.clearSortState();
    this.showColumnSettings.set(false);
    this.songTableChange.emit(shuffleSongTable(table));
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

  navigateSongInfoPopup(delta: number) {
    const table = this.songTable();
    const index = this.activeSongIndex();
    if (!table || table.length <= 1 || index < 0) {
      return;
    }

    const song = table[(index + delta + table.length) % table.length];
    this.modalService.open({ type: 'song-info', song });
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
    const table = this.songTable();
    if (!table) return;
    const nextTable = removeSongFromTable(table, song);
    if (!nextTable) return;
    if (this.activeSong() === song) {
      this.closeSongInfoPopup();
    }
    this.songTableChange.emit(nextTable);
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
    const table = this.songTable();
    const nextTable = draggedSong && table
      ? moveSongInTable(table, draggedSong, targetSong, this.dragInsertAfter())
      : null;
    this.clearDragState();
    if (!nextTable) return;

    this.clearSortState();
    this.songTableChange.emit(nextTable);
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
