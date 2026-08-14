import { ChangeDetectionStrategy, Component, computed, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { AudioPlaybackService } from '../audio/audio-playback.service';
import { ClipboardService } from '../shared/clipboard.service';
import { RankedStatusService } from '../shared/ranked-status.service';
import { AppModalService } from '../modals/app-modal.service';
import { NotificationService } from '../shared/notification.service';
import { UserPreferencesService } from '../settings/user-preferences.service';
import { SongTableStatsComponent } from './song-table-stats.component';
import { collectPersonIds } from './song-credits';
import { hasAnnSongId, hasSongPlaybackSource, SongCredit, Song } from '../songs/song';
import { PLAYLIST_TOGGLE_MESSAGES, PlaylistService } from '../playlist/playlist.service';
import { SongSearchController } from '../search/song-search-controller.service';
import { SongWorkspaceStore } from '../songs/song-workspace.store';
import { getColumnCopyValue, getColumnDisplayValue, SongColumnDefinition } from './song-table-columns';
import { SongTableExtensionCellDirective } from './song-table-extension-cell.directive';
import { ANIME_LIST_SITES, SONG_DIST_LINKS } from './song-links';
import { SongTableController } from './song-table.controller';

type ReorderDragState<Item> = {
  dragged: Item;
  over: Item | null;
  insertAfter: boolean;
};

@Component({
  selector: 'app-song-table',
  templateUrl: './song-table.component.html',
  styleUrls: ['./song-table.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onAnyClick($event)',
    '(document:keydown.escape)': 'closeOpenTablePopover()',
  },
  imports: [SongTableExtensionCellDirective, SongTableStatsComponent],
})
export class SongTableComponent {
  private readonly searches = inject(SongSearchController);
  readonly workspace = inject(SongWorkspaceStore);
  readonly table = inject(SongTableController);
  readonly audioPlayback = inject(AudioPlaybackService);
  readonly clipboard = inject(ClipboardService);
  private readonly notifications = inject(NotificationService);
  readonly preferences = inject(UserPreferencesService);
  private readonly rankedStatusService = inject(RankedStatusService);
  private readonly modals = inject(AppModalService);
  private readonly playlistService = inject(PlaylistService);

  readonly searchErrorMessage = this.searches.searchError;
  readonly rankedActive = this.rankedStatusService.active;

  readonly songTable = this.workspace.songs;
  readonly animeTitleLang = computed(
    () => this.preferences.preferences().animeTitleLanguage,
  );
  readonly currentAudioSong = this.audioPlayback.currentSong;

  readonly tableHeaders = this.table.visibleColumns;
  readonly availableColumns = this.table.availableColumns;
  readonly showColumnSettings = signal(false);
  readonly showTableStats = signal(false);
  private readonly autoAddSongIds = computed(
    () => new Set(this.playlistService.autoAddPlaylist()?.annSongIds ?? []),
  );
  readonly columnSettingsArea = viewChild<ElementRef<HTMLElement>>(
    'columnSettingsArea',
  );
  readonly animeListSites = ANIME_LIST_SITES;
  readonly songDistLinks = SONG_DIST_LINKS;

  readonly sortState = this.table.sortState;
  private readonly songDrag = signal<ReorderDragState<Song> | null>(null);
  private readonly columnDrag = signal<ReorderDragState<string> | null>(null);

  readonly isSongPlayable = hasSongPlaybackSource;
  readonly hasAnnSongId = hasAnnSongId;

  openPlaylistPicker(song: Song): void {
    if (!hasAnnSongId(song)) return;

    const playlist = this.playlistService.ensureSelectedPlaylist();
    if (this.playlistService.autoAddEnabled() && playlist) {
      const result = this.playlistService.toggleSong(playlist.id, song.annSongId);
      const message = PLAYLIST_TOGGLE_MESSAGES[result];
      if (message) this.notifications.show(message);
      return;
    }

    this.modals.open({ type: 'playlist-picker', song });
  }

  isAlreadyInAutoAddPlaylist(song: Song): boolean {
    return this.autoAddSongIds().has(song.annSongId);
  }

  constructor() {
    effect(() => {
      const activeModal = this.modals.active();
      if (activeModal) {
        this.showTableStats.set(false);
        this.showColumnSettings.set(false);
      }
    });

  }

  toggleColumnSettings(event: Event) {
    event.stopPropagation();
    this.showColumnSettings.update((open) => !open);
    if (!this.showColumnSettings()) this.clearColumnDragState();
  }

  isCurrentAudioSong(song: Song) {
    return song.annSongId === this.currentAudioSong()?.annSongId;
  }

  private closeSongInfoPopup() {
    this.modals.close('song-info');
  }

  onAnyClick(event: MouseEvent) {
    const target = event.target as Node;

    if (this.showColumnSettings()) {
      if (!this.columnSettingsArea()?.nativeElement.contains(target)) {
        this.showColumnSettings.set(false);
        this.clearColumnDragState();
      }
    }
  }

  closeOpenTablePopover() {
    this.showTableStats.set(false);
    this.showColumnSettings.set(false);
    this.clearColumnDragState();
  }

  onColumnDragStart(event: DragEvent, columnId: string): void {
    this.columnDrag.set({
      dragged: columnId,
      over: null,
      insertAfter: false,
    });
    event.stopPropagation();

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', columnId);
    }
  }

  onColumnDragOver(event: DragEvent, columnId: string): void {
    const drag = this.columnDrag();
    if (!drag || drag.dragged === columnId) return;

    event.preventDefault();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.columnDrag.set({
      ...drag,
      over: columnId,
      insertAfter: event.clientY > rect.top + rect.height / 2,
    });

    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  onColumnDrop(event: DragEvent, targetColumnId: string): void {
    event.preventDefault();
    event.stopPropagation();

    const drag = this.columnDrag();
    if (drag) {
      this.table.moveColumn(
        drag.dragged,
        targetColumnId,
        drag.insertAfter,
      );
    }
    this.clearColumnDragState();
  }

  onColumnDragEnd(): void {
    this.clearColumnDragState();
  }

  isDraggingColumn(columnId: string): boolean {
    return this.columnDrag()?.dragged === columnId;
  }

  isColumnDragOverBefore(columnId: string): boolean {
    const drag = this.columnDrag();
    return !!drag && drag.over === columnId && !drag.insertAfter;
  }

  isColumnDragOverAfter(columnId: string): boolean {
    const drag = this.columnDrag();
    return !!drag && drag.over === columnId && drag.insertAfter;
  }

  getColumnDisplayValue(song: Song, column: SongColumnDefinition) {
    return getColumnDisplayValue(song, column, this.animeTitleLang());
  }

  getColumnCopyValue(song: Song, column: SongColumnDefinition) {
    return getColumnCopyValue(song, column, this.animeTitleLang());
  }

  displaySongInfoPopup(song: Song) {
    const activeModal = this.modals.active();
    if (activeModal?.type === 'song-info' && activeModal.song === song) {
      this.closeSongInfoPopup();
      return;
    }

    this.modals.open({ type: 'song-info', song });
  }

  onRowDragStart(event: DragEvent, song: Song) {
    this.songDrag.set({
      dragged: song,
      over: null,
      insertAfter: false,
    });
    event.stopPropagation();

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', '');
    }
  }

  onRowDragOver(event: DragEvent, song: Song) {
    const drag = this.songDrag();
    if (!drag || drag.dragged === song) {
      return;
    }

    event.preventDefault();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.songDrag.set({
      ...drag,
      over: song,
      insertAfter: event.clientY > rect.top + rect.height / 2,
    });

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onRowDrop(event: DragEvent, targetSong: Song) {
    event.preventDefault();
    event.stopPropagation();

    const drag = this.songDrag();
    if (drag) {
      this.workspace.move(drag.dragged, targetSong, drag.insertAfter);
    }
    this.clearDragState();
  }

  onRowDragEnd() {
    this.clearDragState();
  }

  isDraggingSong(song: Song) {
    return this.songDrag()?.dragged === song;
  }

  isDragOverBefore(song: Song) {
    const drag = this.songDrag();
    return !!drag && drag.over === song && !drag.insertAfter;
  }

  isDragOverAfter(song: Song) {
    const drag = this.songDrag();
    return !!drag && drag.over === song && drag.insertAfter;
  }

  private clearDragState() {
    this.songDrag.set(null);
  }

  private clearColumnDragState(): void {
    this.columnDrag.set(null);
  }

  searchArtistIds(artists: SongCredit[]): void {
    this.searches.searchArtistIds(collectPersonIds(artists));
  }

  searchComposerIds(composers: SongCredit[]): void {
    this.searches.searchComposerIds(collectPersonIds(composers));
  }

  searchAnnId(id: string | number): void {
    this.searches.searchAnnIds([id]);
  }
}
