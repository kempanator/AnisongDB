import type { Playlist } from './playlist.types';

export type PlaylistSort =
  | 'created-desc'
  | 'created-asc'
  | 'name-asc'
  | 'name-desc'
  | 'size-desc'
  | 'size-asc';

export const DEFAULT_PLAYLIST_SORT: PlaylistSort = 'created-desc';

export const PLAYLIST_SORT_OPTIONS: ReadonlyArray<{ value: PlaylistSort; label: string }> = [
  { value: 'created-desc', label: 'Newest first' },
  { value: 'created-asc', label: 'Oldest first' },
  { value: 'name-asc', label: 'Name A–Z' },
  { value: 'name-desc', label: 'Name Z–A' },
  { value: 'size-desc', label: 'Most songs' },
  { value: 'size-asc', label: 'Fewest songs' },
];

const PLAYLIST_SORT_VALUES = new Set<PlaylistSort>(
  PLAYLIST_SORT_OPTIONS.map((option) => option.value),
);

export function isPlaylistSort(value: unknown): value is PlaylistSort {
  return typeof value === 'string' && PLAYLIST_SORT_VALUES.has(value as PlaylistSort);
}

export function parsePlaylistSort(value: unknown): PlaylistSort {
  return isPlaylistSort(value) ? value : DEFAULT_PLAYLIST_SORT;
}

export function sortPlaylists(playlists: Playlist[], sort: PlaylistSort): Playlist[] {
  return [...playlists].sort((left, right) => comparePlaylists(left, right, sort));
}

function comparePlaylists(left: Playlist, right: Playlist, sort: PlaylistSort): number {
  switch (sort) {
    case 'name-asc':
      return compareNames(left, right) || compareCreated(left, right, 'asc');
    case 'name-desc':
      return compareNames(right, left) || compareCreated(left, right, 'desc');
    case 'created-asc':
      return compareCreated(left, right, 'asc') || compareNames(left, right);
    case 'created-desc':
      return compareCreated(left, right, 'desc') || compareNames(left, right);
    case 'size-asc':
      return left.annSongIds.length - right.annSongIds.length || compareNames(left, right);
    case 'size-desc':
      return right.annSongIds.length - left.annSongIds.length || compareNames(left, right);
    default:
      return 0;
  }
}

function compareNames(left: Playlist, right: Playlist): number {
  return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
}

function compareCreated(left: Playlist, right: Playlist, direction: 'asc' | 'desc'): number {
  const leftTime = Date.parse(left.createdOn);
  const rightTime = Date.parse(right.createdOn);
  const leftValid = Number.isFinite(leftTime);
  const rightValid = Number.isFinite(rightTime);

  if (!leftValid && !rightValid) {
    return compareNames(left, right);
  }
  if (!leftValid) {
    return 1;
  }
  if (!rightValid) {
    return -1;
  }

  const diff = leftTime - rightTime;
  return direction === 'asc' ? diff : -diff;
}
