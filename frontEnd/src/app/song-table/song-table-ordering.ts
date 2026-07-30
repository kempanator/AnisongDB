import { AnimeTitleLanguage } from '../core/services/user-preferences.service';
import { SongRow } from '../core/models/song';
import { compareSongsByColumn, SongColumnId } from './song-table-columns';

export function sortSongTable(
  songs: readonly SongRow[],
  columnId: SongColumnId,
  ascending: boolean,
  language: AnimeTitleLanguage,
): SongRow[] {
  const direction = ascending ? 1 : -1;
  return [...songs].sort(
    (left, right) => direction * compareSongsByColumn(left, right, columnId, language),
  );
}

export function shuffleSongTable(
  songs: readonly SongRow[],
  random: () => number = Math.random,
): SongRow[] {
  const shuffled = [...songs];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

export function removeSongFromTable(
  songs: readonly SongRow[],
  song: SongRow,
): SongRow[] | null {
  const index = songs.indexOf(song);
  if (index < 0) return null;
  return [...songs.slice(0, index), ...songs.slice(index + 1)];
}

export function moveSongInTable(
  songs: readonly SongRow[],
  movedSong: SongRow,
  targetSong: SongRow,
  insertAfter: boolean,
): SongRow[] | null {
  if (movedSong === targetSong) return null;
  const sourceIndex = songs.indexOf(movedSong);
  if (sourceIndex < 0 || !songs.includes(targetSong)) return null;

  const reordered = [...songs];
  reordered.splice(sourceIndex, 1);
  let targetIndex = reordered.indexOf(targetSong);
  if (targetIndex < 0) return null;
  if (insertAfter) targetIndex += 1;
  reordered.splice(targetIndex, 0, movedSong);
  return reordered;
}
