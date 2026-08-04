import type { SongCredit, SongRow } from '../core/models/song';
import { SONG_DIST_LINKS } from './song-table-columns';
import { formatSongLength, getBroadcastLabel } from './song-table.utils';

export type CreditSearchRole = 'artist' | 'composer';

export type CreditSection = {
  title: string;
  people: SongCredit[];
  role: CreditSearchRole;
};

export type SongDistLinkInfo = {
  kind: string;
  url: string;
  fileName: string;
};

export type SongInfoView = {
  annUrl: string;
  annId: string | number;
  vintage: string;
  animeType: string;
  animeENName: string;
  animeJPName: string;
  animeAltNames: string[];
  annSongId: string | number | null;
  amqSongId: string | number | null;
  malId: string | number | null;
  anidbId: string | number | null;
  anilistId: string | number | null;
  kitsuId: string | number | null;
  songType: string;
  songName: string;
  artist: string;
  broadcast: string;
  difficulty: string | number;
  lengthFormatted: string;
  performance: string;
  distLinks: SongDistLinkInfo[];
  creditSections: CreditSection[];
};

export function buildSongInfoView(song: SongRow, distBaseUrl: string): SongInfoView {
  return {
    annUrl: `https://www.animenewsnetwork.com/encyclopedia/anime.php?id=${song.annId}`,
    annId: song.annId,
    vintage: song.animeVintage ?? '',
    animeType: song.animeType ?? '',
    animeENName: song.animeENName ?? '',
    animeJPName: song.animeJPName ?? '',
    animeAltNames: song.animeAltName ?? [],
    annSongId: song.annSongId !== -1 ? song.annSongId : null,
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

function buildSongDistLinks(song: SongRow, distBaseUrl: string): SongDistLinkInfo[] {
  return SONG_DIST_LINKS.flatMap((link) => {
    const fileName = song[link.field];
    return fileName
      ? [{ kind: link.infoLabel, url: `${distBaseUrl}${fileName}`, fileName }]
      : [];
  });
}

function buildCreditSections(song: SongRow): CreditSection[] {
  const sections: CreditSection[] = [
    { title: 'Artists', people: sortCreditArtists(song.artists), role: 'artist' },
    { title: 'Composers', people: song.composers, role: 'composer' },
    { title: 'Arrangers', people: song.arrangers, role: 'composer' },
  ];
  return sections.filter((section) => section.people.length > 0);
}

function sortCreditArtists(artists: readonly SongCredit[]): SongCredit[] {
  return [...artists].sort(
    (left, right) => creditDetailCount(left) - creditDetailCount(right),
  );
}

function creditDetailCount(person: SongCredit): number {
  const names = person.names?.length ?? 0;
  return (
    (names > 1 ? names : 0) +
    (person.groups?.length ?? 0) +
    (person.members?.length ?? 0)
  );
}

export function creditSearchTitle(
  role: CreditSearchRole,
  scope: 'primary' | 'member' | 'group',
): string {
  const verb = role === 'artist' ? 'sung by' : 'composed by';
  const subject = scope === 'primary'
    ? role === 'artist' ? 'this artist' : 'this composer'
    : scope === 'member' ? 'this member' : 'this group';
  return `Search songs ${verb} ${subject}`;
}
