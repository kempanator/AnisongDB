import type { SongRow } from '../models/song';

function songTypeOrder(songType: unknown): { type: number; number: number } {
  const value = String(songType ?? '').trim();
  const match = /^(Opening|Ending)\s+(\d+)$/i.exec(value);

  if (match) {
    return {
      type: match[1].toLowerCase() === 'opening' ? 0 : 1,
      number: Number(match[2]),
    };
  }

  if (/^Insert Song$/i.test(value)) {
    return { type: 2, number: 0 };
  }

  return { type: 3, number: 0 };
}

/** Compares song types: Opening, then Ending, then Insert Song, then unknown. */
export function compareSongTypes(left: unknown, right: unknown): number {
  const leftOrder = songTypeOrder(left);
  const rightOrder = songTypeOrder(right);

  return leftOrder.type - rightOrder.type || leftOrder.number - rightOrder.number;
}

/**
 * Normalizes a new search result set into the application's default order.
 * It never mutates the API result array.
 */
export function sortSongsByDefault(songList: SongRow[]): SongRow[] {
  return [...songList].sort((left, right) => {
    const annIdComparison = Number(left?.annId ?? -1) - Number(right?.annId ?? -1);
    if (annIdComparison !== 0) {
      return annIdComparison;
    }

    return compareSongTypes(left?.songType, right?.songType);
  });
}

/** Reorders API song rows to match a playlist's saved ANN Song ID order. */
export function reorderSongsByAnnSongIds(songs: SongRow[], annSongIds: number[]): SongRow[] {
  const songsByAnnSongId = new Map<number, SongRow>();
  for (const song of songs) {
    const annSongId = Number(song?.annSongId);
    if (Number.isInteger(annSongId) && annSongId >= 0 && !songsByAnnSongId.has(annSongId)) {
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
