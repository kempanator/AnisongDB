import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import type { SongRow } from '../core/models/song';
import { AppStorageService } from '../core/services/app-storage.service';
import { UserPreferencesService } from '../core/services/user-preferences.service';
import { SongSearchController } from '../search/song-search-controller.service';
import { compareSongsByColumn, SONG_TABLE_COLUMNS, type SongColumnId } from './song-table-columns';

export type SongColumnVisibility = Record<SongColumnId, boolean>;
export type SongTableSort = {
  column: SongColumnId;
  ascending: boolean;
};

@Injectable({ providedIn: 'root' })
export class SongTableController {
  private readonly searches = inject(SongSearchController);
  private readonly storage = inject(AppStorageService);
  private readonly preferences = inject(UserPreferencesService);
  readonly availableColumns = SONG_TABLE_COLUMNS;
  private readonly visibilitySignal = signal<SongColumnVisibility>(this.loadVisibility());
  private readonly sortStateSignal = signal<SongTableSort | null>(null);

  readonly songs = this.searches.songList;
  readonly visibility = this.visibilitySignal.asReadonly();
  readonly visibleColumns = computed(() =>
    this.availableColumns.filter((column) => this.visibilitySignal()[column.id]),
  );
  readonly sortState = this.sortStateSignal.asReadonly();

  constructor() {
    effect(() => {
      if (this.searches.latestResult().order === 'playlist') {
        this.clearSort();
      } else {
        this.sortStateSignal.set({ column: 'annId', ascending: true });
      }
    });

    let previousLanguage = this.preferences.preferences().animeTitleLanguage;
    effect(() => {
      const language = this.preferences.preferences().animeTitleLanguage;
      if (language !== previousLanguage && untracked(this.sortState)?.column === 'anime') {
        this.clearSort();
      }
      previousLanguage = language;
    });
  }

  isVisible(columnId: SongColumnId): boolean {
    return this.visibilitySignal()[columnId];
  }

  setVisible(columnId: SongColumnId, visible: boolean): void {
    const visibility = { ...this.visibilitySignal(), [columnId]: visible };
    this.visibilitySignal.set(visibility);
    this.saveVisibility(visibility);
  }

  updateVisibility(patch: Partial<SongColumnVisibility>): void {
    const visibility = { ...this.visibilitySignal() };
    for (const column of this.availableColumns) {
      const value = patch[column.id];
      if (typeof value === 'boolean') visibility[column.id] = value;
    }
    this.visibilitySignal.set(visibility);
    this.saveVisibility(visibility);
  }

  resetVisibility(): void {
    this.visibilitySignal.set(this.defaultVisibility());
    this.storage.remove('songTableColumnVisibility');
  }

  sort(columnId: SongColumnId): boolean {
    const songs = this.songs();
    const column = this.availableColumns.find((candidate) => candidate.id === columnId);
    if (!songs || !column?.sort) return false;

    const currentSort = this.sortState();
    const ascending = currentSort?.column === columnId ? !currentSort.ascending : true;
    const direction = ascending ? 1 : -1;
    const language = this.preferences.preferences().animeTitleLanguage;
    this.sortStateSignal.set({ column: columnId, ascending });
    this.searches.replaceSongList([...songs].sort(
      (left, right) => direction * compareSongsByColumn(left, right, column, language),
    ));
    return true;
  }

  shuffle(random: () => number = Math.random): boolean {
    const songs = this.songs();
    if (!songs || songs.length < 2) return false;

    const shuffled = [...songs];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }
    this.clearSort();
    this.searches.replaceSongList(shuffled);
    return true;
  }

  remove(song: SongRow): boolean {
    const songs = this.songs();
    const index = songs?.indexOf(song) ?? -1;
    if (!songs || index < 0) return false;

    this.searches.replaceSongList([
      ...songs.slice(0, index),
      ...songs.slice(index + 1),
    ]);
    return true;
  }

  move(movedSong: SongRow, targetSong: SongRow, insertAfter: boolean): boolean {
    const songs = this.songs();
    if (!songs || movedSong === targetSong) return false;

    const sourceIndex = songs.indexOf(movedSong);
    if (sourceIndex < 0 || !songs.includes(targetSong)) return false;

    const reordered = [...songs];
    reordered.splice(sourceIndex, 1);
    let targetIndex = reordered.indexOf(targetSong);
    if (insertAfter) targetIndex += 1;
    reordered.splice(targetIndex, 0, movedSong);

    this.clearSort();
    this.searches.replaceSongList(reordered);
    return true;
  }

  clearSort(): void {
    this.sortStateSignal.set(null);
  }

  private loadVisibility(): SongColumnVisibility {
    const visibility = this.defaultVisibility();
    const stored = this.storage.get('songTableColumnVisibility');
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return visibility;

    for (const column of this.availableColumns) {
      const value = (stored as Record<string, unknown>)[column.id];
      if (typeof value === 'boolean') visibility[column.id] = value;
    }
    return visibility;
  }

  private defaultVisibility(): SongColumnVisibility {
    return Object.fromEntries(
      this.availableColumns.map((column) => [column.id, column.defaultVisible]),
    ) as SongColumnVisibility;
  }

  private saveVisibility(visibility: SongColumnVisibility): void {
    this.storage.update({ songTableColumnVisibility: visibility });
  }
}
