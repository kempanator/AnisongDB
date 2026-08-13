import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { SearchRequestService } from './search-request.service';
import { SongRow } from '../core/models/song';
import { NotificationService } from '../core/services/notification.service';
import { formatSongCount } from '../core/utils/number';
import { reorderSongsByAnnSongIds, sortSongsByDefault } from '../core/utils/song-ordering';
import { SearchCommand, SongId } from './search';

export type PlaylistLoadSource = 'import' | 'saved';

type PlaylistLoad = {
  annSongIds: number[];
  source: PlaylistLoadSource;
};

export type SearchResultState = {
  order: 'default' | 'playlist';
};

/**
 * Owns search execution and the editable, exportable song-list order.
 * HTTP details stay in SearchRequestService; components interact with this
 * controller so cancellation, errors, and canonical ordering have one owner.
 */
@Injectable({ providedIn: 'root' })
export class SongSearchController {
  private readonly requests = inject(SearchRequestService);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  // The key prevents an identical in-flight request from being restarted.
  // Completed searches are not cached or deduplicated.
  private activeSearch: { key: string; subscription: Subscription } | null = null;
  private readonly songListSignal = signal<SongRow[] | null>(null);
  private readonly searchErrorSignal = signal<string | null>(null);
  private readonly latestResultSignal = signal<SearchResultState>({ order: 'default' });

  readonly songList = this.songListSignal.asReadonly();
  readonly searchError = this.searchErrorSignal.asReadonly();
  // A fresh object is published for every completed result, even when its
  // ordering matches the previous result. Consumers can react without a
  // separate revision counter that must be kept in sync.
  readonly latestResult = this.latestResultSignal.asReadonly();

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

  replaceSongList(songList: SongRow[]): void {
    this.songListSignal.set(songList);
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
      this.searchErrorSignal.set(null);
      this.notifyPlaylistLoad(source, 0, 0);
      this.publishResult([], 'playlist');
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
    this.searchErrorSignal.set(null);
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

        this.publishResult(nextSongList, playlistLoad ? 'playlist' : 'default');
      },
      error: (error: unknown) => {
        this.searchErrorSignal.set(formatSearchError(error));
        logSearchError(error);
        this.finishSearch();
      },
      complete: () => this.finishSearch(),
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

  private publishResult(songList: SongRow[], order: SearchResultState['order']): void {
    this.songListSignal.set(songList);
    this.latestResultSignal.set({ order });
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
