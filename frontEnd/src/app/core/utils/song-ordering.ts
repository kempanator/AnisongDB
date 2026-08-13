import type { SongRow } from '../models/song';
import { parseNonNegativeInteger } from './number';
import { compareSongTypes } from './song-metadata';

/**
 * Orders songs the same way as an ascending ANN ID table sort.
 */
export function compareSongsByAnnId(left: SongRow, right: SongRow): number {
  return left.annId - right.annId
    || compareSongTypes(left.songType, right.songType)
    || left.annSongId - right.annSongId;
}

/** Normalizes a new result set without mutating the API response array. */
export function sortSongsByDefault(songList: SongRow[]): SongRow[] {
  return [...songList].sort(compareSongsByAnnId);
}

/** Reorders API song rows to match a playlist's saved ANN Song ID order. */
export function reorderSongsByAnnSongIds(songs: SongRow[], annSongIds: number[]): SongRow[] {
  const songsByAnnSongId = new Map<number, SongRow>();
  for (const song of songs) {
    const annSongId = parseNonNegativeInteger(song?.annSongId);
    if (annSongId !== null && !songsByAnnSongId.has(annSongId)) {
      songsByAnnSongId.set(annSongId, song);
    }
  }

  const ordered: SongRow[] = [];
  const seenIds = new Set<number>();
  for (const annSongId of annSongIds) {
    if (seenIds.has(annSongId)) {
      continue;
    }
    seenIds.add(annSongId);
    const song = songsByAnnSongId.get(annSongId);
    if (song) {
      ordered.push(song);
    }
  }
  return ordered;
}
