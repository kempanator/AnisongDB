import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { SearchRequestService } from './search-request.service';
import { NotificationService } from '../shared/notification.service';
import { formatSongCount } from '../shared/number';
import { reorderSongsByAnnSongIds, sortSongsByDefault } from '../songs/song-ordering';
import { SongWorkspaceStore } from '../songs/song-workspace.store';
import { SearchCommand, SongId } from './search';

type PlaylistLoadSource = 'import' | 'saved';

type PlaylistLoad = {
  annSongIds: number[];
  source: PlaylistLoadSource;
};

export type SearchRequestState =
  | { status: 'idle' }
  | { status: 'loading'; command: SearchCommand }
  | { status: 'error'; message: string };

/**
 * Owns search request execution, cancellation, and errors. Successful results
 * are committed to SongWorkspaceStore, which owns the current song collection.
 */
@Injectable({ providedIn: 'root' })
export class SongSearchController {
  private readonly requests = inject(SearchRequestService);
  private readonly workspace = inject(SongWorkspaceStore);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  // The key prevents an identical in-flight request from being restarted.
  // Completed searches are not cached or deduplicated.
  private activeSearch: { key: string; subscription: Subscription } | null = null;
  private readonly requestStateSignal = signal<SearchRequestState>({ status: 'idle' });

  readonly requestState = this.requestStateSignal.asReadonly();
  readonly searchError = computed(() => {
    const state = this.requestStateSignal();
    return state.status === 'error' ? state.message : null;
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.activeSearch?.subscription.unsubscribe());
  }

  startInitialSearch(): boolean {
    return this.runSearch({ kind: 'initial-random' });
  }

  runSearch(command: SearchCommand): boolean {
    const searchKey = this.searchKey(command);
    // Do not restart an identical request that is already in flight.
    if (searchKey === this.activeSearch?.key) return false;
    this.execute(command, null);
    return true;
  }

  searchSeason(season: string): boolean {
    return this.runSearch({ kind: 'season', body: { season } });
  }

  searchAnnIds(ids: SongId[]): boolean {
    return this.runSearch({ kind: 'ann-ids', body: { ann_ids: ids } });
  }

  searchAnnSongIds(ids: SongId[]): boolean {
    return this.runSearch({ kind: 'ann-song-ids', body: { ann_song_ids: ids } });
  }

  loadPlaylist(ids: number[], source: PlaylistLoadSource): void {
    if (!ids.length) {
      // Empty playlists are valid, but the ID-search API correctly rejects an
      // empty ID list. Apply the empty result locally instead of presenting a
      // normal playlist load as a request-validation failure.
      this.cancelActiveSearch();
      this.requestStateSignal.set({ status: 'idle' });
      this.notifyPlaylistLoad(source, 0, 0);
      this.workspace.replace([], null);
      return;
    }

    this.execute({ kind: 'ann-song-ids', body: { ann_song_ids: ids } }, {
      annSongIds: [...ids],
      source,
    });
  }

  searchAmqSongIds(ids: SongId[]): boolean {
    return this.runSearch({ kind: 'amq-song-ids', body: { amq_song_ids: ids } });
  }

  searchArtistIds(artistIds: number[]): boolean {
    return this.runSearch({
      kind: 'artist-ids',
      body: {
        artist_ids: artistIds,
        group_granularity: 0,
        max_other_artist: 99,
      },
    });
  }

  searchComposerIds(composerIds: number[]): boolean {
    return this.runSearch({
      kind: 'composer-ids',
      body: { composer_ids: composerIds, arrangement: true },
    });
  }

  private execute(
    command: SearchCommand,
    playlistLoad: PlaylistLoad | null,
  ): void {
    const request = this.requests.request(command);
    this.cancelActiveSearch();
    this.requestStateSignal.set({ status: 'loading', command });
    const searchKey = this.searchKey(command);

    const subscription = request.subscribe({
      next: (results) => {
        const nextSongList = playlistLoad
          ? reorderSongsByAnnSongIds(results, playlistLoad.annSongIds)
          : sortSongsByDefault(results);

        if (playlistLoad) {
          this.notifyPlaylistLoad(
            playlistLoad.source,
            new Set(playlistLoad.annSongIds).size,
            nextSongList.length,
          );
        }

        this.workspace.replace(
          nextSongList,
          playlistLoad ? null : { column: 'annId', ascending: true },
        );
      },
      error: (error: unknown) => {
        this.requestStateSignal.set({
          status: 'error',
          message: formatSearchError(error),
        });
        logSearchError(error);
        this.finishSearch();
      },
      complete: () => {
        this.requestStateSignal.set({ status: 'idle' });
        this.finishSearch();
      },
    });
    this.activeSearch = subscription.closed ? null : { key: searchKey, subscription };
  }

  private cancelActiveSearch(): void {
    // HttpClient observables honor RxJS unsubscription. Once unsubscribed, the
    // old subscriber cannot deliver next/error/complete, so a separate request
    // generation counter or stale-callback guard would be redundant here.
    this.activeSearch?.subscription.unsubscribe();
    this.activeSearch = null;
  }

  private finishSearch(): void {
    this.activeSearch = null;
  }

  private searchKey(command: SearchCommand): string {
    return JSON.stringify(command);
  }

  private notifyPlaylistLoad(
    source: PlaylistLoadSource,
    requestedCount: number,
    loadedCount: number,
  ): void {
    if (loadedCount < requestedCount) {
      this.notifications.show(`Loaded ${loadedCount} of ${requestedCount} songs.`);
    } else if (source === 'import') {
      this.notifications.show(`Loaded ${formatSongCount(loadedCount)} into the table.`);
    }
  }
}

function formatSearchError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'Search failed';
  const body = error.error;
  if (typeof body === 'string') return body.trim() || 'Search failed';
  if (!body || typeof body !== 'object') return 'Search failed';

  const detail = (body as { detail?: unknown }).detail;
  if (typeof detail === 'string') return detail.trim() || 'Search failed';
  if (!Array.isArray(detail)) return 'Search failed';

  const messages = detail
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object' && 'msg' in item) {
        return String((item as { msg: unknown }).msg).trim();
      }
      return '';
    })
    .filter(Boolean);
  return [...new Set(messages)].join(' ') || 'Search failed';
}

function logSearchError(error: unknown): void {
  if (error instanceof HttpErrorResponse) {
    console.error(
      error.status === 0 ? 'An error occurred:' : `Backend returned code ${error.status}, body was:`,
      error.error,
    );
    return;
  }
  console.error('Search failed:', error);
}
