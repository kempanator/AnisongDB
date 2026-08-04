import type { SongCredit } from '../core/models/song';

export function formatSongLength(
  length: string | number | null | undefined,
): string {
  if (length == null || length === '') {
    return '';
  }

  const seconds = Math.round(Number(length));
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '';
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = String(seconds % 60).padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
}

export function getBroadcastLabel(song: {
  isDub?: boolean | null;
  isRebroadcast?: boolean | null;
}): string {
  const labels: string[] = [];
  if (song.isDub) {
    labels.push('Dub');
  }
  if (song.isRebroadcast) {
    labels.push('Rebroadcast');
  }
  return labels.length ? labels.join(', ') : 'Normal';
}

export function collectPersonIds(
  people: SongCredit | readonly SongCredit[] | null | undefined,
): number[] {
  const entries: readonly SongCredit[] = Array.isArray(people)
    ? people
    : people ? [people as SongCredit] : [];
  return entries.map((person) => person.id);
}
