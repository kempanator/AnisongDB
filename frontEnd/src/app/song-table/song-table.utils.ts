import {
  EMPTY_TABLE_STATS,
  StatBreakdownEntry,
  TableStats,
  TableStatsBreakdown,
  StatRankingEntry,
  CreditPerson,
  CreditSection,
  CreditSearchRole,
  SongInfoView,
  SongDistLinkInfo,
} from './song-table.types';
import { SongRow } from '../core/models/song';
import type { AnimeTitleLanguage } from '../core/services/user-preferences.service';

const SONG_TYPE_SORT_ORDER = ['OP', 'ED', 'IN'];
const BROADCAST_SORT_ORDER = ['Normal', 'Dub', 'Rebroadcast', 'Dub, Rebroadcast'];
const PERFORMANCE_SORT_ORDER = ['Standard', 'Character', 'Chanting', 'Instrumental', 'Other'];
const ANIME_TYPE_SORT_ORDER = ['TV', 'Movie', 'OVA', 'ONA', 'Special', 'Other'];
const DIFFICULTY_BUCKET_LABELS = [
  '0–9',
  '10–19',
  '20–29',
  '30–39',
  '40–49',
  '50–59',
  '60–69',
  '70–79',
  '80–89',
  '90–100',
];

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

export function formatAvgLength(seconds: number | null): string {
  if (seconds == null) {
    return '—';
  }

  return formatSongLength(seconds) || '—';
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

export function collectPersonIds(people: unknown): number[] {
  if (!people) {
    return [];
  }

  if (typeof people === 'object' && people !== null && 'id' in people) {
    const id = (people as { id?: number }).id;
    return id != null ? [id] : [];
  }

  if (Array.isArray(people)) {
    return people
      .map((person) => (person as { id?: number })?.id)
      .filter((id): id is number => id != null);
  }

  return Object.values(people as Record<string, { id?: number }>)
    .map((person) => person?.id)
    .filter((id): id is number => id != null);
}

/** Extra credit details (alt names, groups, members) that make a card taller. */
function creditDetailCount(person: CreditPerson): number {
  const names = person.names?.length ?? 0;
  return (
    (names > 1 ? names : 0) +
    (person.groups?.length ?? 0) +
    (person.members?.length ?? 0)
  );
}

/** Show artists with the least extra detail first so the credit grid stays compact. */
export function sortCreditArtists(artists: CreditPerson[]): CreditPerson[] {
  return [...artists].sort(
    (left, right) => creditDetailCount(left) - creditDetailCount(right),
  );
}

function computeAverage(songs: { songDifficulty?: number | null }[]): number {
  if (!songs?.length) {
    return 0;
  }

  // 0, null, undefined, NaN, are not valid difficulties
  const diffs = songs
    .filter((song) => song.songDifficulty)
    .map((song) => song.songDifficulty as number);

  if (!diffs.length) {
    return 0;
  }

  const total = diffs.reduce((sum, item) => sum + item, 0);
  return Number((total / diffs.length).toFixed(1));
}

function shortenSongType(songType: string | null | undefined): string {
  if (!songType?.trim()) {
    return '(none)';
  }

  if (songType.startsWith('Opening')) {
    return 'OP';
  }

  if (songType.startsWith('Ending')) {
    return 'ED';
  }

  if (songType.startsWith('Insert')) {
    return 'IN';
  }

  return songType.trim();
}

function incrementStatCount(
  counts: TableStatsBreakdown,
  value: string | null | undefined,
) {
  const label = value?.trim() || '(none)';
  counts[label] = (counts[label] ?? 0) + 1;
}

function buildStatBreakdownEntries(
  counts: TableStatsBreakdown,
  total: number,
  sortLabels?: string[],
): StatBreakdownEntry[] {
  const entries = Object.entries(counts).map(([label, count]) => ({
    label,
    count,
    percent: total ? Number(((count / total) * 100).toFixed(1)) : 0,
  }));

  if (sortLabels?.length) {
    return entries.sort((left, right) => {
      const leftIndex = sortLabels.indexOf(left.label);
      const rightIndex = sortLabels.indexOf(right.label);
      const leftRank = leftIndex === -1 ? sortLabels.length + 1 : leftIndex;
      const rightRank = rightIndex === -1 ? sortLabels.length + 1 : rightIndex;

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return left.label.localeCompare(right.label);
    });
  }

  return entries.sort((left, right) => left.label.localeCompare(right.label));
}

function buildTopRankings(counts: Map<string, StatRankingEntry>): StatRankingEntry[] {
  return [...counts.values()]
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, 10);
}

function getArtistLabel(artist: CreditPerson): string {
  return artist.names?.find((name) => name.trim())?.trim() || '(none)';
}

function buildDifficultyBreakdown(songs: SongRow[]): StatBreakdownEntry[] {
  const counts = DIFFICULTY_BUCKET_LABELS.map((label) => ({ label, count: 0 }));
  let validDifficultyCount = 0;

  for (const song of songs) {
    const difficulty = Number(song.songDifficulty);
    if (!Number.isFinite(difficulty) || difficulty <= 0) continue;

    const bucketIndex = Math.min(9, Math.floor(difficulty / 10));
    counts[bucketIndex].count += 1;
    validDifficultyCount += 1;
  }

  return counts.map(({ label, count }) => ({
    label,
    count,
    percent: validDifficultyCount ? Number(((count / validDifficultyCount) * 100).toFixed(1)) : 0,
  }));
}

export function computeTableStats(
  songs: SongRow[] | null | undefined,
  animeTitleLang: AnimeTitleLanguage = 'JP',
): TableStats {
  if (!songs?.length) {
    return { ...EMPTY_TABLE_STATS };
  }

  const animeIds = new Set<number>();
  const artistIds = new Set<number>();
  const animeTypeCounts: TableStatsBreakdown = {};
  const songTypeCounts: TableStatsBreakdown = {};
  const broadcastCounts: TableStatsBreakdown = {};
  const performanceCounts: TableStatsBreakdown = {};
  const lengths: number[] = [];
  const animeCounts = new Map<string, StatRankingEntry>();
  const artistCounts = new Map<string, StatRankingEntry>();

  for (const song of songs) {
    if (song.annId != null) {
      animeIds.add(song.annId);
    }

    for (const artistId of collectPersonIds(song.artists)) {
      artistIds.add(artistId);
    }

    const animeKey = String(song.annId);
    const animeLabel = animeTitleLang === 'JP' ? song.animeJPName : song.animeENName;
    const animeEntry = animeCounts.get(animeKey);
    if (animeEntry) {
      animeEntry.count += 1;
    } else {
      animeCounts.set(animeKey, { key: animeKey, label: animeLabel || '(none)', count: 1 });
    }

    const artistsInSong = new Set<number>();
    for (const artist of song.artists ?? []) {
      const artistKey = String(artist.id);
      if (artistsInSong.has(artist.id)) continue;
      artistsInSong.add(artist.id);
      const artistEntry = artistCounts.get(artistKey);
      if (artistEntry) {
        artistEntry.count += 1;
      } else {
        artistCounts.set(artistKey, { key: artistKey, label: getArtistLabel(artist), count: 1 });
      }
    }

    incrementStatCount(animeTypeCounts, song.animeType);
    incrementStatCount(songTypeCounts, shortenSongType(song.songType));
    incrementStatCount(broadcastCounts, getBroadcastLabel(song));
    incrementStatCount(performanceCounts, song.songCategory);

    if (song.songLength != null && !Number.isNaN(Number(song.songLength))) {
      lengths.push(Number(song.songLength));
    }
  }

  const avgLength = lengths.length
    ? Number((lengths.reduce((sum, value) => sum + value, 0) / lengths.length).toFixed(1))
    : null;

  const songCount = songs.length;

  return {
    songCount,
    uniqueAnime: animeIds.size,
    uniqueArtists: artistIds.size,
    avgDifficulty: computeAverage(songs),
    avgLength,
    songTypeBreakdown: buildStatBreakdownEntries(
      songTypeCounts,
      songCount,
      SONG_TYPE_SORT_ORDER,
    ),
    broadcastBreakdown: buildStatBreakdownEntries(
      broadcastCounts,
      songCount,
      BROADCAST_SORT_ORDER,
    ),
    performanceBreakdown: buildStatBreakdownEntries(
      performanceCounts,
      songCount,
      PERFORMANCE_SORT_ORDER,
    ),
    animeTypeBreakdown: buildStatBreakdownEntries(
      animeTypeCounts,
      songCount,
      ANIME_TYPE_SORT_ORDER,
    ),
    topAnime: buildTopRankings(animeCounts),
    topArtists: buildTopRankings(artistCounts),
    difficultyBreakdown: buildDifficultyBreakdown(songs),
  };
}

export function buildCreditSections(song: {
  artists?: CreditPerson[];
  composers?: CreditPerson[];
  arrangers?: CreditPerson[];
}): CreditSection[] {
  const sections: CreditSection[] = [
    {
      title: 'Artists',
      people: sortCreditArtists(song.artists ?? []),
      role: 'artist',
    },
    {
      title: 'Composers',
      people: song.composers ?? [],
      role: 'composer',
    },
    {
      title: 'Arrangers',
      people: song.arrangers ?? [],
      role: 'composer',
    },
  ];

  return sections.filter((section) => section.people.length > 0);
}

function getDistUrl(
  distBaseUrl: string,
  filename: string | null | undefined,
): string {
  return filename ? `${distBaseUrl}${filename}` : '';
}

export function buildSongDistLinks(
  song: { HQ?: string | null; MQ?: string | null; audio?: string | null },
  distBaseUrl: string,
): SongDistLinkInfo[] {
  const links: SongDistLinkInfo[] = [];

  if (song.HQ) {
    links.push({ kind: '720p', url: getDistUrl(distBaseUrl, song.HQ), fileName: song.HQ });
  }
  if (song.MQ) {
    links.push({ kind: '480p', url: getDistUrl(distBaseUrl, song.MQ), fileName: song.MQ });
  }
  if (song.audio) {
    links.push({
      kind: 'MP3',
      url: getDistUrl(distBaseUrl, song.audio),
      fileName: song.audio,
    });
  }

  return links;
}

export function buildSongInfoView(
  song: SongRow,
  distBaseUrl: string,
): SongInfoView {
  return {
    annUrl: `https://www.animenewsnetwork.com/encyclopedia/anime.php?id=${song.annId}`,
    annId: song.annId,
    vintage: song.animeVintage ?? '',
    animeType: song.animeType ?? '',
    animeENName: song.animeENName ?? '',
    animeJPName: song.animeJPName ?? '',
    animeAltNames: song.animeAltName ?? [],
    annSongId: song.annSongId != null && song.annSongId !== -1 ? song.annSongId : null,
    amqSongId: song.amqSongId ?? null,
    malId: song.linked_ids?.myanimelist ?? null,
    anidbId: song.linked_ids?.anidb ?? null,
    anilistId: song.linked_ids?.anilist ?? null,
    kitsuId: song.linked_ids?.kitsu ?? null,
    songType: song.songType ?? '',
    songName: song.songName ?? '',
    artist: song.songArtist ?? '',
    broadcast: getBroadcastLabel(song),
    difficulty: song.songDifficulty ?? '',
    lengthFormatted: formatSongLength(song.songLength),
    performance: song.songCategory ?? '',
    distLinks: buildSongDistLinks(song, distBaseUrl),
    creditSections: buildCreditSections(song),
  };
}

export function creditSearchTitle(
  role: CreditSearchRole,
  scope: 'primary' | 'member' | 'group',
): string {
  const verb = role === 'artist' ? 'sung by' : 'composed by';
  const subject =
    scope === 'primary'
      ? role === 'artist'
        ? 'this artist'
        : 'this composer'
      : scope === 'member'
        ? 'this member'
        : 'this group';

  return `Search songs ${verb} ${subject}`;
}
