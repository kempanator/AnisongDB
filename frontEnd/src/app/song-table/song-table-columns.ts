import { compareSongTypes } from '../core/utils/song-ordering';
import type { AnimeTitleLanguage } from '../core/services/user-preferences.service';
import type { SongRow, SortableSongValue } from '../core/models/song';
import { formatSongLength, getBroadcastLabel } from './song-table.utils';

type SongColumnReader<Value> = (
  song: SongRow,
  language: AnimeTitleLanguage,
) => Value;

type SortableSongField = {
  [Field in keyof SongRow]: SongRow[Field] extends SortableSongValue ? Field : never;
}[keyof SongRow];

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
  sortable: boolean;
  centered?: boolean;
  nowrap?: boolean;

  // Plain fields provide the default sort, display, and copy values.
  field?: SortableSongField;

  // Derived sort keys affect ordering only and are never displayed implicitly.
  sortKey?: SongColumnReader<SortableSongValue>;
  compare?: SongColumnComparator;

  // Columns can insert a secondary comparison before the shared fallback chain.
  tieBreak?: SongColumnComparator;
  display?: SongColumnReader<string | number>;
  copy?: SongColumnReader<string>;
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

const compareSongNames: SongColumnComparator = (left, right) =>
  comparePrimitiveValues(left.songName, right.songName);

const SONG_TABLE_COLUMN_CONFIGS = [
  {
    id: 'info',
    header: 'Info',
    defaultVisible: true,
    sortable: false,
    centered: true,
  },
  {
    id: 'rowNumber',
    header: '#',
    visibilityLabel: 'Row Number',
    defaultVisible: false,
    sortable: false,
    centered: true,
  },
  {
    id: 'annId',
    header: 'ANN ID',
    defaultVisible: true,
    sortable: true,
    nowrap: true,
    field: 'annId',
    tieBreak: (left, right) => compareSongTypes(left.songType, right.songType),
  },
  {
    id: 'annSongId',
    header: 'ANN Song ID',
    defaultVisible: false,
    sortable: true,
    field: 'annSongId',
    display: (song) => song.annSongId !== -1 ? song.annSongId : '–',
  },
  {
    id: 'amqSongId',
    header: 'AMQ Song ID',
    defaultVisible: false,
    sortable: true,
    field: 'amqSongId',
  },
  {
    id: 'animeLists',
    header: 'Anime Lists',
    defaultVisible: false,
    sortable: false,
    nowrap: true,
  },
  {
    id: 'season',
    header: 'Season',
    defaultVisible: true,
    sortable: true,
    field: 'animeVintage',
    sortKey: (song) => {
      const parsed = parseVintage(song.animeVintage || '');
      return parsed.year === null ? -1 : parsed.year * 10 + parsed.seasonIndex;
    },
    tieBreak: (left, right, language) =>
      comparePrimitiveValues(
        getAnimeTitle(left, language),
        getAnimeTitle(right, language),
      ) || compareSongTypes(left.songType, right.songType),
    display: (song) => getSeasonYearValue(song),
  },
  {
    id: 'animeCategory',
    header: 'Anime Category',
    defaultVisible: false,
    sortable: true,
    field: 'animeCategory',
  },
  {
    id: 'anime',
    header: 'Anime',
    defaultVisible: true,
    sortable: true,
    sortKey: getAnimeTitle,
    tieBreak: (left, right) => compareSongTypes(left.songType, right.songType),
    display: getAnimeTitle,
  },
  {
    id: 'broadcast',
    header: 'Broadcast',
    defaultVisible: false,
    sortable: true,
    nowrap: true,
    sortKey: (song) => song.isDub && song.isRebroadcast
      ? 3
      : song.isRebroadcast ? 2 : song.isDub ? 1 : 0,
    display: (song) => getBroadcastLabel(song),
  },
  {
    id: 'songType',
    header: 'Song Type',
    defaultVisible: true,
    sortable: true,
    nowrap: true,
    field: 'songType',
    compare: (left, right) => compareSongTypes(left.songType, right.songType),
  },
  {
    id: 'performance',
    header: 'Performance',
    defaultVisible: false,
    sortable: true,
    field: 'songCategory',
  },
  {
    id: 'songName',
    header: 'Song Name',
    defaultVisible: true,
    sortable: true,
    field: 'songName',
  },
  {
    id: 'artist',
    header: 'Artist',
    defaultVisible: true,
    sortable: true,
    field: 'songArtist',
    tieBreak: compareSongNames,
  },
  {
    id: 'composer',
    header: 'Composer',
    defaultVisible: false,
    sortable: true,
    field: 'songComposer',
    tieBreak: compareSongNames,
  },
  {
    id: 'arranger',
    header: 'Arranger',
    defaultVisible: false,
    sortable: true,
    field: 'songArranger',
    tieBreak: compareSongNames,
  },
  {
    id: 'difficulty',
    header: 'Difficulty',
    defaultVisible: false,
    sortable: true,
    field: 'songDifficulty',
    sortKey: (song) => Number(song.songDifficulty ?? -1),
    display: (song) => song.songDifficulty != null ? `${song.songDifficulty}%` : '–',
    copy: (song) => String(song.songDifficulty ?? ''),
  },
  {
    id: 'length',
    header: 'Length',
    defaultVisible: false,
    sortable: true,
    field: 'songLength',
    sortKey: (song) => Number(song.songLength ?? -1),
    display: (song) => formatSongLength(song.songLength) || '–',
  },
  {
    id: 'songLinks',
    header: 'Song Links',
    defaultVisible: false,
    sortable: false,
    nowrap: true,
  },
  {
    id: 'playAudio',
    header: 'Play',
    visibilityLabel: 'Play Audio',
    defaultVisible: true,
    sortable: false,
    centered: true,
  },
  {
    id: 'addPlaylist',
    header: 'Add',
    visibilityLabel: 'Add to Playlist',
    defaultVisible: false,
    sortable: false,
    centered: true,
  },
  {
    id: 'moveRow',
    header: 'Move',
    visibilityLabel: 'Move Row',
    defaultVisible: false,
    sortable: false,
    centered: true,
  },
  {
    id: 'deleteRow',
    header: 'Del',
    visibilityLabel: 'Delete Row',
    defaultVisible: true,
    sortable: false,
    centered: true,
  },
] as const satisfies readonly SongColumnConfig[];

export type SongColumnId = typeof SONG_TABLE_COLUMN_CONFIGS[number]['id'];
export type SongColumnDefinition = SongColumnConfig<SongColumnId>;
export const SONG_TABLE_COLUMNS: readonly SongColumnDefinition[] =
  SONG_TABLE_COLUMN_CONFIGS;

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
  Autumn: 3,
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
  const column = SONG_TABLE_COLUMN_BY_ID.get(columnId);
  if (column?.display) return column.display(song, language);

  // Display falls back only to the underlying field, never to an opaque sort key.
  const value = column ? readFieldValue(column, song) : null;
  if (value === null || value === undefined || value === '') return '–';
  return typeof value === 'boolean' ? String(value) : value;
}

export function getColumnCopyValue(
  song: SongRow,
  columnId: SongColumnId,
  language: AnimeTitleLanguage,
): string {
  const copy = SONG_TABLE_COLUMN_BY_ID.get(columnId)?.copy;
  if (copy) return copy(song, language);

  const display = getColumnDisplayValue(song, columnId, language);
  if (display === '–') return '';
  return String(display);
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

export function compareSongsByColumn(
  left: SongRow,
  right: SongRow,
  columnId: SongColumnId,
  language: AnimeTitleLanguage,
): number {
  const column = SONG_TABLE_COLUMN_BY_ID.get(columnId);
  if (!column?.sortable) return 0;

  // Bespoke comparison wins; otherwise derived keys take precedence over fields.
  let comparison = column.compare
    ? column.compare(left, right, language)
    : comparePrimitiveValues(
        readSortKey(column, left, language),
        readSortKey(column, right, language),
      );

  if (comparison === 0 && column.tieBreak) {
    comparison = column.tieBreak(left, right, language);
  }
  return comparison || compareDefaultTieBreaks(left, right);
}

function compareDefaultTieBreaks(left: SongRow, right: SongRow): number {
  // ANN ID groups an anime; song type and ANN Song ID finish ordering its songs.
  return comparePrimitiveValues(left.annId, right.annId)
    || compareSongTypes(left.songType, right.songType)
    || comparePrimitiveValues(left.annSongId, right.annSongId);
}

function readSortKey(
  column: SongColumnConfig,
  song: SongRow,
  language: AnimeTitleLanguage,
): SortableSongValue {
  if (column.sortKey) return column.sortKey(song, language);
  return readFieldValue(column, song);
}

function readFieldValue(
  column: SongColumnConfig,
  song: SongRow,
): SortableSongValue {
  if (!column.field) return null;
  return song[column.field] as SortableSongValue;
}
