import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Injector,
  output,
  signal,
} from '@angular/core';
import { formatSongCount } from '../core/models/song';
import { NotificationService } from '../core/services/notification.service';
import { SongSearchController } from '../core/services/song-search-controller.service';
import { ModalShellComponent } from '../shared/modal-shell.component';
import { PLAYLIST_MAX_SONGS, PlaylistService } from './playlist.service';
import { PLAYLIST_SORT_OPTIONS } from './playlist-sort';
import type { PlaylistSort } from './playlist-sort';
import type { Playlist } from './playlist.types';

@Component({
  selector: 'app-playlist-dialog',
  imports: [ModalShellComponent],
  templateUrl: './playlist-dialog.component.html',
  styleUrls: ['./playlist-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:resize)': 'closeActions()',
  },
})
export class PlaylistDialogComponent {
  readonly closed = output<void>();
  readonly playlistService = inject(PlaylistService);
  readonly sortedPlaylists = this.playlistService.sortedPlaylists;
  readonly playlistSortOptions = PLAYLIST_SORT_OPTIONS;
  readonly formatSongCount = formatSongCount;
  readonly openActionsId = signal<string | null>(null);
  readonly openActionsPlaylist = computed(() => {
    const playlistId = this.openActionsId();
    return playlistId
      ? this.playlistService.playlists().find((playlist) => playlist.id === playlistId) ?? null
      : null;
  });
  readonly actionsMenuPosition = signal<{ left: number; top: number } | null>(null);
  private readonly songs = inject(SongSearchController);
  private readonly notifications = inject(NotificationService);
  private readonly injector = inject(Injector);
  private actionsMenuTrigger: HTMLElement | null = null;

  createPlaylist(input: HTMLInputElement): void {
    const ids = this.playlistService.annSongIdsFromRows(this.songs.songList() ?? []);
    const playlist = this.playlistService.createPlaylist(input.value, ids);
    if (!playlist) {
      this.notifications.show('Enter a playlist name.');
      return;
    }
    input.value = '';
    this.notifications.show(
      `Saved “${playlist.name}” with ${formatSongCount(playlist.annSongIds.length)}.`,
    );
  }

  loadPlaylist(playlist: Playlist): void {
    this.songs.loadPlaylist(playlist.annSongIds, 'saved');
    this.closed.emit();
  }

  toggleActions(playlistId: string, event: MouseEvent): void {
    event.stopPropagation();
    if (this.openActionsId() === playlistId) {
      this.closeActions();
      return;
    }

    const trigger = event.currentTarget as HTMLElement;
    this.openActions(playlistId, trigger);
  }

  onActionsTriggerKeydown(playlistId: string, event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.openActionsId() === playlistId) {
      event.preventDefault();
      event.stopPropagation();
      this.closeActions(true);
      return;
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

    event.preventDefault();
    event.stopPropagation();
    const focusLastItem = event.key === 'ArrowUp';
    if (this.openActionsId() === playlistId) {
      this.focusActionsMenu(playlistId, focusLastItem);
    } else {
      this.openActions(playlistId, event.currentTarget as HTMLElement, focusLastItem);
    }
  }

  private openActions(playlistId: string, trigger: HTMLElement, focusLastItem = false): void {
    this.actionsMenuTrigger = trigger;
    this.actionsMenuPosition.set(null);
    this.openActionsId.set(playlistId);

    // The @if creates the menu hidden so it can be measured without flashing in
    // the wrong place. Positioning makes it visible on the following render, so
    // focus must wait for that second render; hidden elements cannot take focus.
    afterNextRender(() => {
      if (!this.positionActionsMenu(trigger, playlistId)) return;
      afterNextRender(() => this.focusActionsMenu(playlistId, focusLastItem), { injector: this.injector });
    }, { injector: this.injector });
  }

  closeActions(restoreFocus = false): void {
    const trigger = this.actionsMenuTrigger;
    const menuId = this.openActionsId();
    const menu = menuId ? document.getElementById(`playlist-actions-${menuId}`) : null;
    const shouldRestoreFocus = restoreFocus || !!menu?.contains(document.activeElement);

    this.openActionsId.set(null);
    this.actionsMenuPosition.set(null);
    this.actionsMenuTrigger = null;

    if (shouldRestoreFocus && trigger?.isConnected) {
      trigger.focus({ preventScroll: true });
    }
  }

  onActionsMenuKeydown(event: KeyboardEvent): void {
    const menu = event.currentTarget as HTMLElement;
    const items = Array.from(
      menu.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])'),
    );
    if (!items.length) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.closeActions(true);
      return;
    }

    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    let nextIndex: number;
    if (event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % items.length;
    } else if (event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + items.length) % items.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = items.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    items[nextIndex].focus({ preventScroll: true });
  }

  setSort(event: Event): void {
    this.playlistService.setPlaylistSort((event.target as HTMLSelectElement).value as PlaylistSort);
  }

  isAutoAddPlaylist(playlist: Playlist): boolean {
    return this.playlistService.autoAddPlaylist()?.id === playlist.id;
  }

  toggleAutoAdd(playlist: Playlist): void {
    this.closeActions();
    if (this.isAutoAddPlaylist(playlist)) {
      this.playlistService.cancelAutoAdd();
      this.notifications.show(`Auto-add stopped for “${playlist.name}”.`);
    } else {
      this.playlistService.startAutoAdd(playlist.id);
      this.notifications.show(`Auto-add enabled for “${playlist.name}”.`);
    }
  }

  duplicate(playlist: Playlist): void {
    this.closeActions();
    const duplicate = this.playlistService.duplicatePlaylist(playlist.id);
    this.notifications.show(duplicate ? `Created “${duplicate.name}”.` : 'Could not duplicate that playlist.');
  }

  appendTable(playlist: Playlist): void {
    this.closeActions();
    const ids = this.playlistService.annSongIdsFromRows(this.songs.songList() ?? [], Infinity);
    if (!ids.length) {
      this.notifications.show('There are no songs in the table to append.');
      return;
    }
    const result = this.playlistService.appendSongs(playlist.id, ids);
    if (!result) {
      this.notifications.show('Could not update that playlist.');
      return;
    }
    if (!result.addedCount && result.skippedForLimitCount) {
      this.notifications.show(`Playlist is full (${PLAYLIST_MAX_SONGS} songs).`);
      return;
    }
    if (!result.addedCount) {
      this.notifications.show('All table songs are already in this playlist.');
      return;
    }
    const suffix = result.skippedForLimitCount
      ? ` ${result.skippedForLimitCount} skipped because the playlist reached ${PLAYLIST_MAX_SONGS} songs.`
      : '';
    this.notifications.show(
      `Added ${formatSongCount(result.addedCount)} to “${playlist.name}”.${suffix}`,
    );
  }

  replaceWithTable(playlist: Playlist): void {
    this.closeActions();
    const ids = this.playlistService.annSongIdsFromRows(this.songs.songList() ?? []);
    if (!ids.length) {
      this.notifications.show('There are no songs in the table to replace this playlist with.');
      return;
    }
    const label = formatSongCount(ids.length);
    if (!window.confirm(`Replace all songs in “${playlist.name}” with the ${label} currently in the table?`)) return;
    this.notifications.show(this.playlistService.replaceSongs(playlist.id, ids)
      ? `Replaced “${playlist.name}” with ${label}.`
      : 'Could not update that playlist.');
  }

  rename(playlist: Playlist): void {
    this.closeActions();
    const name = window.prompt('Playlist name', playlist.name);
    if (name === null) return;
    this.notifications.show(this.playlistService.renamePlaylist(playlist.id, name)
      ? 'Playlist renamed.'
      : 'Enter a playlist name.');
  }

  deletePlaylist(playlist: Playlist): void {
    this.closeActions();
    if (!window.confirm(`Delete “${playlist.name}”?`)) return;
    this.playlistService.deletePlaylist(playlist.id);
    this.notifications.show('Playlist deleted.');
  }

  onImport(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) void this.importFile(file);
  }

  formatDate(createdOn: string): string {
    const date = new Date(createdOn);
    return Number.isNaN(date.getTime()) ? createdOn : date.toLocaleDateString();
  }

  private async importFile(file: File): Promise<void> {
    try {
      const ids = this.playlistService.extractAnnSongIds(JSON.parse(await file.text()));
      if (!ids.length) {
        this.notifications.show('No ANN Song IDs were found in that JSON file.');
        return;
      }
      this.songs.loadPlaylist(ids, 'import');
      this.closed.emit();
    } catch (_error) {
      this.notifications.show('Could not read that JSON file.');
    }
  }

  private positionActionsMenu(trigger: HTMLElement, playlistId: string): boolean {
    if (this.openActionsId() !== playlistId || !trigger.isConnected) return false;

    const menu = document.getElementById(`playlist-actions-${playlistId}`);
    const modal = trigger.closest<HTMLElement>('.modal-shell-content');
    if (!menu || !modal) return false;

    const gap = 5;
    const edge = 8;
    const triggerRect = trigger.getBoundingClientRect();
    const modalRect = modal.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const maximumLeft = Math.max(edge, modalRect.width - menuRect.width - edge);
    const left = Math.min(Math.max(edge, triggerRect.right - modalRect.left - menuRect.width), maximumLeft);
    const below = triggerRect.bottom - modalRect.top + gap;
    const above = triggerRect.top - modalRect.top - menuRect.height - gap;
    const maximumTop = Math.max(edge, modalRect.height - menuRect.height - edge);
    const preferredTop = below + menuRect.height <= modalRect.height - edge ? below : above;
    const top = Math.min(Math.max(edge, preferredTop), maximumTop);

    this.actionsMenuPosition.set({ left, top });
    return true;
  }

  private focusActionsMenu(playlistId: string, focusLastItem = false): void {
    if (this.openActionsId() !== playlistId) return;

    const items = Array.from(
      document.querySelectorAll<HTMLElement>(
        `#playlist-actions-${CSS.escape(playlistId)} [role="menuitem"]:not([disabled])`,
      ),
    );
    const item = focusLastItem ? items.at(-1) : items[0];
    item?.focus({ preventScroll: true });
  }
}
