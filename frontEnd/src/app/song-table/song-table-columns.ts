import { compareSongTypes } from '../core/utils/song-ordering';
import type { AnimeTitleLanguage } from '../core/services/user-preferences.service';
import type { SongRow, SortableSongValue } from '../core/models/song';
import { formatSongLength, getBroadcastLabel } from './song-table.utils';

type SongColumnReader<Value> = (
  song: SongRow,
  language: AnimeTitleLanguage,
) => Value;

type SongColumnComparator = (
  left: SongRow,
  right: SongRow,
  language: AnimeTitleLanguage,
) => number;

type SongColumnConfig<Id extends string = string> = {
  id: Id;
  header: string;
  visibilityLabel?: string;
  defaultVisible: boolean;
  centered?: boolean;
  nowrap?: boolean;
  // Cell value shown in the table.
  display?: SongColumnReader<string | number>;
  // Clipboard text value.
  copy?: SongColumnReader<string>;
  // Complete column comparison before the shared default tie-break chain.
  sort?: SongColumnComparator;
};

export type AnimeListSite = {
  img: string;
  alt: string;
  getUrl: (song: SongRow) => string | null;
};

export type SongDistLink = {
  label: string;
  infoLabel: string;
  title: string;
  field: 'HQ' | 'MQ' | 'audio';
};

const getAnimeTitle: SongColumnReader<string> = (song, language) =>
  language === 'JP' ? song.animeJPName : song.animeENName;

const compareSongType: SongColumnComparator = (left, right) =>
  compareSongTypes(left.songType, right.songType);

const compareSongName: SongColumnComparator = (left, right) =>
  comparePrimitiveValues(left.songName, right.songName);

const compareAnimeTitle: SongColumnComparator = (left, right, language) =>
  comparePrimitiveValues(
    getAnimeTitle(left, language),
    getAnimeTitle(right, language),
  );

const SONG_TABLE_COLUMN_CONFIGS = [
  {
    id: 'info',
    header: 'Info',
    defaultVisible: true,
    centered: true,
  },
  {
    id: 'rowNumber',
    header: '#',
    visibilityLabel: 'Row Number',
    defaultVisible: false,
    centered: true,
  },
  {
    id: 'annId',
    header: 'ANN ID',
    defaultVisible: true,
    nowrap: true,
    display: (song) => song.annId,
    copy: (song) => String(song.annId),
    sort: sortBy(
      (song) => song.annId,
      compareSongType,
    ),
  },
  {
    id: 'annSongId',
    header: 'ANN Song ID',
    defaultVisible: false,
    display: (song) => (song.annSongId !== -1 ? song.annSongId : '–'),
    copy: (song) => (song.annSongId !== -1 ? String(song.annSongId) : ''),
    sort: sortBy((song) => song.annSongId),
  },
  {
    id: 'amqSongId',
    header: 'AMQ Song ID',
    defaultVisible: false,
    display: (song) => song.amqSongId,
    copy: (song) => String(song.amqSongId),
    sort: sortBy((song) => song.amqSongId),
  },
  {
    id: 'animeLists',
    header: 'Anime Lists',
    defaultVisible: false,
    nowrap: true,
  },
  {
    id: 'season',
    header: 'Season',
    defaultVisible: true,
    display: (song) => getSeasonYearValue(song),
    copy: (song) => {
      const value = getSeasonYearValue(song);
      return value === '–' ? '' : value;
    },
    sort: sortBy(
      (song) => {
        const parsed = parseVintage(song.animeVintage || '');
        return parsed.year === null ? -1 : parsed.year * 10 + parsed.seasonIndex;
      },
      compareAnimeTitle,
      compareSongType,
    ),
  },
  {
    id: 'animeType',
    header: 'Anime Type',
    defaultVisible: false,
    display: (song) => song.animeType || '–',
    copy: (song) => song.animeType || '',
    sort: sortBy((song) => song.animeType),
  },
  {
    id: 'anime',
    header: 'Anime',
    defaultVisible: true,
    display: getAnimeTitle,
    copy: getAnimeTitle,
    sort: sortBy(
      getAnimeTitle,
      compareSongType,
    ),
  },
  {
    id: 'broadcast',
    header: 'Broadcast',
    defaultVisible: false,
    nowrap: true,
    display: (song) => getBroadcastLabel(song),
    copy: (song) => getBroadcastLabel(song) || '',
    sort: sortBy((song) =>
      song.isDub && song.isRebroadcast ? 3 : song.isRebroadcast ? 2 : song.isDub ? 1 : 0,
    ),
  },
  {
    id: 'songType',
    header: 'Song Type',
    defaultVisible: true,
    nowrap: true,
    display: (song) => song.songType || '–',
    copy: (song) => song.songType || '',
    sort: compareSongType,
  },
  {
    id: 'performance',
    header: 'Performance',
    defaultVisible: false,
    display: (song) => song.songCategory || '–',
    copy: (song) => song.songCategory || '',
    sort: sortBy((song) => song.songCategory),
  },
  {
    id: 'songName',
    header: 'Song Name',
    defaultVisible: true,
    display: (song) => song.songName || '–',
    copy: (song) => song.songName || '',
    sort: sortBy((song) => song.songName),
  },
  {
    id: 'artist',
    header: 'Artist',
    defaultVisible: true,
    display: (song) => song.songArtist || '–',
    copy: (song) => song.songArtist || '',
    sort: sortBy(
      (song) => song.songArtist,
      compareSongName,
    ),
  },
  {
    id: 'composer',
    header: 'Composer',
    defaultVisible: false,
    display: (song) => song.songComposer || '–',
    copy: (song) => song.songComposer || '',
    sort: sortBy(
      (song) => song.songComposer,
      compareSongName,
    ),
  },
  {
    id: 'arranger',
    header: 'Arranger',
    defaultVisible: false,
    display: (song) => song.songArranger || '–',
    copy: (song) => song.songArranger || '',
    sort: sortBy(
      (song) => song.songArranger,
      compareSongName,
    ),
  },
  {
    id: 'difficulty',
    header: 'Difficulty',
    defaultVisible: false,
    display: (song) => song.songDifficulty != null ? `${song.songDifficulty}%` : '–',
    copy: (song) => String(song.songDifficulty ?? ''),
    sort: sortBy((song) => Number(song.songDifficulty ?? -1)),
  },
  {
    id: 'length',
    header: 'Length',
    defaultVisible: false,
    display: (song) => formatSongLength(song.songLength) || '–',
    copy: (song) => formatSongLength(song.songLength) || '',
    sort: sortBy((song) => Number(song.songLength ?? -1)),
  },
  {
    id: 'songLinks',
    header: 'Song Links',
    defaultVisible: false,
    nowrap: true,
  },
  {
    id: 'playAudio',
    header: 'Play',
    visibilityLabel: 'Play Audio',
    defaultVisible: true,
    centered: true,
  },
  {
    id: 'addPlaylist',
    header: 'Add',
    visibilityLabel: 'Add to Playlist',
    defaultVisible: false,
    centered: true,
  },
  {
    id: 'moveRow',
    header: 'Move',
    visibilityLabel: 'Move Row',
    defaultVisible: false,
    centered: true,
  },
  {
    id: 'deleteRow',
    header: 'Del',
    visibilityLabel: 'Delete Row',
    defaultVisible: true,
    centered: true,
  },
] as const satisfies readonly SongColumnConfig[];

export type SongColumnId = typeof SONG_TABLE_COLUMN_CONFIGS[number]['id'];
export type SongColumnDefinition = SongColumnConfig<SongColumnId>;
export const SONG_TABLE_COLUMNS: readonly SongColumnDefinition[] = SONG_TABLE_COLUMN_CONFIGS;

const SONG_TABLE_COLUMN_BY_ID = new Map<SongColumnId, SongColumnDefinition>(
  SONG_TABLE_COLUMNS.map((column) => [column.id, column]),
);

export const ANIME_LIST_SITES: readonly AnimeListSite[] = [
  {
    img: 'assets/img/ANN_Logo.png',
    alt: 'Anime News Network',
    getUrl: (song) => `https://www.animenewsnetwork.com/encyclopedia/anime.php?id=${song.annId}`,
  },
  {
    img: 'assets/img/MyAnimeList_Logo.png',
    alt: 'MyAnimeList',
    getUrl: (song) => song.linked_ids?.myanimelist
      ? `https://myanimelist.net/anime/${song.linked_ids.myanimelist}`
      : null,
  },
  {
    img: 'assets/img/AniDB_Logo.png',
    alt: 'Anidb',
    getUrl: (song) => song.linked_ids?.anidb
      ? `https://anidb.net/anime/${song.linked_ids.anidb}`
      : null,
  },
  {
    img: 'assets/img/AniList_logo.png',
    alt: 'Anilist',
    getUrl: (song) => song.linked_ids?.anilist
      ? `https://anilist.co/anime/${song.linked_ids.anilist}`
      : null,
  },
  {
    img: 'assets/img/Kitsu_Logo.png',
    alt: 'Kitsu',
    getUrl: (song) => song.linked_ids?.kitsu
      ? `https://kitsu.app/anime/${song.linked_ids.kitsu}`
      : null,
  },
];

export const SONG_DIST_LINKS = [
  { label: '720', infoLabel: '720p', title: 'Open 720 link', field: 'HQ' },
  { label: '480', infoLabel: '480p', title: 'Open 480 link', field: 'MQ' },
  { label: 'MP3', infoLabel: 'MP3', title: 'Open MP3 link', field: 'audio' },
] as const satisfies readonly SongDistLink[];

const SEASON_ORDER: Record<string, number> = {
  Winter: 0,
  Spring: 1,
  Summer: 2,
  Fall: 3,
};

export function parseVintage(vintage: string): {
  season: string;
  year: number | null;
  seasonIndex: number;
} {
  const parsed = /^([A-Za-z]+)\s+(\d{4})$/.exec((vintage || '').trim());
  if (!parsed) return { season: '', year: null, seasonIndex: 4 };

  const season = parsed[1].charAt(0).toUpperCase() + parsed[1].slice(1).toLowerCase();
  return {
    season,
    year: Number.parseInt(parsed[2], 10),
    seasonIndex: SEASON_ORDER[season] ?? 4,
  };
}

export function getSeasonYearValue(song: SongRow): string {
  const parsed = parseVintage(song.animeVintage || '');
  return parsed.year === null
    ? song.animeVintage || '–'
    : `${parsed.season} ${parsed.year}`;
}

export function getColumnDisplayValue(
  song: SongRow,
  columnId: SongColumnId,
  language: AnimeTitleLanguage,
): string | number {
  return SONG_TABLE_COLUMN_BY_ID.get(columnId)?.display?.(song, language) ?? '–';
}

export function getColumnCopyValue(
  song: SongRow,
  columnId: SongColumnId,
  language: AnimeTitleLanguage,
): string {
  return SONG_TABLE_COLUMN_BY_ID.get(columnId)?.copy?.(song, language) ?? '';
}

export function comparePrimitiveValues(
  left: SortableSongValue,
  right: SortableSongValue,
): number {
  if (left === right) return 0;
  if (left === undefined || left === null) return 1;
  if (right === undefined || right === null) return -1;
  if (typeof left === 'number' && typeof right === 'number') return left < right ? -1 : 1;
  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

function sortBy(
  read: SongColumnReader<SortableSongValue>,
  ...tieBreaks: SongColumnComparator[]
): SongColumnComparator {
  return (left, right, language) => {
    let comparison = comparePrimitiveValues(
      read(left, language),
      read(right, language),
    );

    for (const tieBreak of tieBreaks) {
      if (comparison !== 0) break;
      comparison = tieBreak(left, right, language);
    }

    return comparison;
  };
}

export function compareSongsByColumn(
  left: SongRow,
  right: SongRow,
  columnId: SongColumnId,
  language: AnimeTitleLanguage,
): number {
  const column = SONG_TABLE_COLUMN_BY_ID.get(columnId);
  if (!column?.sort) return 0;

  return column.sort(left, right, language)
    || compareDefaultTieBreaks(left, right);
}

function compareDefaultTieBreaks(left: SongRow, right: SongRow): number {
  // ANN ID groups an anime; song type and ANN Song ID finish ordering its songs.
  return comparePrimitiveValues(left.annId, right.annId)
    || compareSongTypes(left.songType, right.songType)
    || comparePrimitiveValues(left.annSongId, right.annSongId);
}
