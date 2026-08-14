import { afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef, inject, Injector, signal, viewChild } from '@angular/core';
import { downloadJsonFile, readJsonFile, sanitizeFileNameSegment } from '../shared/json-file';
import { formatSongCount } from '../shared/number';
import { AppModalService } from '../modals/app-modal.service';
import { NotificationService } from '../shared/notification.service';
import { SongSearchController } from '../search/song-search-controller.service';
import { ModalShellComponent } from '../shared/modal-shell.component';
import { SongWorkspaceStore } from '../songs/song-workspace.store';
import { PLAYLIST_MAX_SONGS, PlaylistService } from './playlist.service';
import { PLAYLIST_SORT_OPTIONS, type Playlist } from './playlist';

type ActionsMenuState = {
  playlistId: string;
  position: { left: number; top: number } | null;
  trigger: HTMLElement;
};

@Component({
  selector: 'app-playlist-dialog',
  imports: [ModalShellComponent],
  templateUrl: './playlist-dialog.component.html',
  styleUrls: ['./playlist-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeActions()',
    '(window:resize)': 'closeActions()',
  },
})
export class PlaylistDialogComponent {
  readonly modals = inject(AppModalService);
  readonly playlistService = inject(PlaylistService);
  readonly sortedPlaylists = this.playlistService.sortedPlaylists;
  readonly playlistSortOptions = PLAYLIST_SORT_OPTIONS;
  readonly formatSongCount = formatSongCount;
  private readonly actionsMenuState = signal<ActionsMenuState | null>(null);
  private readonly actionsMenuElement = viewChild<ElementRef<HTMLElement>>('actionsMenu');
  readonly openActionsId = computed(() => this.actionsMenuState()?.playlistId ?? null);
  readonly openActionsPlaylist = computed(() => {
    const playlistId = this.openActionsId();
    return playlistId
      ? this.playlistService.playlists().find((playlist) => playlist.id === playlistId) ?? null
      : null;
  });
  readonly actionsMenuPosition = computed(() => this.actionsMenuState()?.position ?? null);
  private readonly searches = inject(SongSearchController);
  private readonly workspace = inject(SongWorkspaceStore);
  private readonly notifications = inject(NotificationService);
  private readonly injector = inject(Injector);

  createPlaylist(input: HTMLInputElement): void {
    const ids = this.playlistService.annSongIdsFromRows(this.workspace.songs() ?? []);
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
    this.searches.loadPlaylist(playlist.annSongIds, 'saved');
    this.modals.close('playlists');
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
    this.actionsMenuState.set({ playlistId, position: null, trigger });

    // The @if creates the menu hidden so it can be measured without flashing in
    // the wrong place. Positioning makes it visible on the following render, so
    // focus must wait for that second render; hidden elements cannot take focus.
    afterNextRender(() => {
      if (!this.positionActionsMenu(playlistId)) return;
      afterNextRender(() => this.focusActionsMenu(playlistId, focusLastItem), { injector: this.injector });
    }, { injector: this.injector });
  }

  closeActions(restoreFocus = false): void {
    const state = this.actionsMenuState();
    const menu = this.actionsMenuElement()?.nativeElement;
    const shouldRestoreFocus = restoreFocus || !!menu?.contains(document.activeElement);

    this.actionsMenuState.set(null);

    if (shouldRestoreFocus && state?.trigger.isConnected) {
      state.trigger.focus({ preventScroll: true });
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

  isAutoAddPlaylist(playlist: Playlist): boolean {
    return this.playlistService.autoAddPlaylist()?.id === playlist.id;
  }

  toggleAutoAdd(playlist: Playlist): void {
    if (this.isAutoAddPlaylist(playlist)) {
      this.playlistService.cancelAutoAdd();
      this.notifications.show(`Auto-add stopped for “${playlist.name}”.`);
    } else {
      this.playlistService.startAutoAdd(playlist.id);
      this.notifications.show(`Auto-add enabled for “${playlist.name}”.`);
    }
  }

  duplicate(playlist: Playlist): void {
    const duplicate = this.playlistService.duplicatePlaylist(playlist.id);
    this.notifications.show(duplicate ? `Created “${duplicate.name}”.` : 'Could not duplicate that playlist.');
  }

  exportPlaylist(playlist: Playlist): void {
    downloadJsonFile(
      `${sanitizeFileNameSegment(playlist.name) || 'playlist'}-playlist.json`,
      {
        name: playlist.name,
        createdOn: playlist.createdOn,
        annSongIds: playlist.annSongIds,
      },
      2,
    );
  }

  appendTable(playlist: Playlist): void {
    const ids = this.playlistService.annSongIdsFromRows(this.workspace.songs() ?? [], Infinity);
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
    const ids = this.playlistService.annSongIdsFromRows(this.workspace.songs() ?? []);
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
    const name = window.prompt('Playlist name', playlist.name);
    if (name === null) return;
    this.notifications.show(this.playlistService.renamePlaylist(playlist.id, name)
      ? 'Playlist renamed.'
      : 'Enter a playlist name.');
  }

  deletePlaylist(playlist: Playlist): void {
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
      const ids = this.playlistService.extractAnnSongIds(await readJsonFile(file));
      if (!ids.length) {
        this.notifications.show('No ANN Song IDs were found in that JSON file.');
        return;
      }
      this.searches.loadPlaylist(ids, 'import');
      this.modals.close('playlists');
    } catch (_error) {
      this.notifications.show('Could not read that JSON file.');
    }
  }

  private positionActionsMenu(playlistId: string): boolean {
    const state = this.actionsMenuState();
    if (state?.playlistId !== playlistId || !state.trigger.isConnected) return false;

    const menu = this.actionsMenuElement()?.nativeElement;
    const modal = state.trigger.closest<HTMLElement>('.modal-shell-content');
    if (!menu || !modal) return false;

    const gap = 5;
    const edge = 8;
    const triggerRect = state.trigger.getBoundingClientRect();
    const modalRect = modal.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const maximumLeft = Math.max(edge, modalRect.width - menuRect.width - edge);
    const left = Math.min(Math.max(edge, triggerRect.right - modalRect.left - menuRect.width), maximumLeft);
    const below = triggerRect.bottom - modalRect.top + gap;
    const above = triggerRect.top - modalRect.top - menuRect.height - gap;
    const maximumTop = Math.max(edge, modalRect.height - menuRect.height - edge);
    const preferredTop = below + menuRect.height <= modalRect.height - edge ? below : above;
    const top = Math.min(Math.max(edge, preferredTop), maximumTop);

    this.actionsMenuState.set({ ...state, position: { left, top } });
    return true;
  }

  private focusActionsMenu(playlistId: string, focusLastItem = false): void {
    if (this.openActionsId() !== playlistId) return;

    const items = Array.from(
      this.actionsMenuElement()?.nativeElement.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([disabled])',
      ) ?? [],
    );
    const item = focusLastItem ? items.at(-1) : items[0];
    item?.focus({ preventScroll: true });
  }
}
