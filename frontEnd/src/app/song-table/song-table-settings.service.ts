import { computed, inject, Injectable, signal } from '@angular/core';
import { UserPreferencesService } from '../core/services/user-preferences.service';
import { SONG_TABLE_COLUMNS, SongColumnId } from './song-table-columns';

export type SongColumnVisibility = Record<SongColumnId, boolean>;

@Injectable({ providedIn: 'root' })
export class SongTableSettingsService {
  readonly availableColumns = SONG_TABLE_COLUMNS;
  private readonly preferences = inject(UserPreferencesService);

  private readonly visibilitySignal = signal<SongColumnVisibility>(this.loadVisibility());
  readonly visibility = this.visibilitySignal.asReadonly();
  readonly visibleColumns = computed(() =>
    this.availableColumns.filter((column) => this.visibilitySignal()[column.id]),
  );

  isVisible(columnId: SongColumnId): boolean {
    return this.visibilitySignal()[columnId];
  }

  setVisible(columnId: SongColumnId, visible: boolean): void {
    const next = { ...this.visibilitySignal(), [columnId]: visible };
    this.visibilitySignal.set(next);
    this.saveVisibility(next);
  }

  resetColumnVisibility(): void {
    this.visibilitySignal.set(this.defaultVisibility());
    try {
      this.preferences.removeStoredValues('songTableColumnVisibility');
    } catch (_error) {
      // Keep the in-memory reset usable when storage is unavailable.
    }
  }

  private loadVisibility(): SongColumnVisibility {
    const visibility = this.defaultVisibility();
    const storedVisibility = this.preferences.getStoredValue('songTableColumnVisibility');
    if (!storedVisibility || typeof storedVisibility !== 'object' || Array.isArray(storedVisibility)) {
      return visibility;
    }

    for (const column of this.availableColumns) {
      const stored = (storedVisibility as Record<string, unknown>)[column.id];
      if (typeof stored === 'boolean') visibility[column.id] = stored;
    }

    return visibility;
  }

  private defaultVisibility(): SongColumnVisibility {
    return Object.fromEntries(
      this.availableColumns.map((column) => [column.id, column.defaultVisible]),
    ) as SongColumnVisibility;
  }

  private saveVisibility(visibility: SongColumnVisibility): void {
    try {
      this.preferences.updateStoredValues({ songTableColumnVisibility: visibility });
    } catch (_error) {
      // Keep in-memory settings usable when storage is unavailable.
    }
  }
}
