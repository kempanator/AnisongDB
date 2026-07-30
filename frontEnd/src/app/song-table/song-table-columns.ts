import { compareSongTypes } from '../core/utils/song-ordering';
import type { AnimeTitleLanguage } from '../core/services/user-preferences.service';
import type { SongRow, SortableSongValue } from '../core/models/song';
import { formatSongLength, getBroadcastLabel } from './song-table.utils';

export type SongColumnId =
  | 'info'
  | 'rowNumber'
  | 'annId'
  | 'annSongId'
  | 'amqSongId'
  | 'animeLists'
  | 'season'
  | 'animeCategory'
  | 'anime'
  | 'broadcast'
  | 'songType'
  | 'performance'
  | 'songName'
  | 'artist'
  | 'composer'
  | 'arranger'
  | 'difficulty'
  | 'length'
  | 'songLinks'
  | 'playAudio'
  | 'addPlaylist'
  | 'moveRow'
  | 'deleteRow';

export type SongColumnDefinition = {
  id: SongColumnId;
  header: string;
  visibilityLabel?: string;
  defaultVisible: boolean;
  sortable: boolean;
  centered?: boolean;
  nowrap?: boolean;
};

export type AnimeListSite = {
  img: string;
  alt: string;
  getUrl: (song: SongRow) => string | null;
};

export type SongDistLink = {
  label: string;
  title: string;
  field: 'HQ' | 'MQ' | 'audio';
};

export const SONG_TABLE_COLUMNS: readonly SongColumnDefinition[] = [
  { id: 'info', header: 'Info', defaultVisible: true, sortable: false, centered: true },
  { id: 'rowNumber', header: '#', visibilityLabel: 'Row Number', defaultVisible: false, sortable: false, centered: true },
  { id: 'annId', header: 'ANN ID', defaultVisible: true, sortable: true, nowrap: true },
  { id: 'annSongId', header: 'ANN Song ID', defaultVisible: false, sortable: true },
  { id: 'amqSongId', header: 'AMQ Song ID', defaultVisible: false, sortable: true },
  { id: 'animeLists', header: 'Anime Lists', defaultVisible: false, sortable: false, nowrap: true },
  { id: 'season', header: 'Season', defaultVisible: true, sortable: true },
  { id: 'animeCategory', header: 'Anime Category', defaultVisible: false, sortable: true },
  { id: 'anime', header: 'Anime', defaultVisible: true, sortable: true },
  { id: 'broadcast', header: 'Broadcast', defaultVisible: false, sortable: true, nowrap: true },
  { id: 'songType', header: 'Song Type', defaultVisible: true, sortable: true, nowrap: true },
  { id: 'performance', header: 'Performance', defaultVisible: false, sortable: true },
  { id: 'songName', header: 'Song Name', defaultVisible: true, sortable: true },
  { id: 'artist', header: 'Artist', defaultVisible: true, sortable: true },
  { id: 'composer', header: 'Composer', defaultVisible: false, sortable: true },
  { id: 'arranger', header: 'Arranger', defaultVisible: false, sortable: true },
  { id: 'difficulty', header: 'Difficulty', defaultVisible: false, sortable: true },
  { id: 'length', header: 'Length', defaultVisible: false, sortable: true },
  { id: 'songLinks', header: 'Song Links', defaultVisible: false, sortable: false, nowrap: true },
  { id: 'playAudio', header: 'Play', visibilityLabel: 'Play Audio', defaultVisible: true, sortable: false, centered: true },
  { id: 'addPlaylist', header: 'Add', visibilityLabel: 'Add to Playlist', defaultVisible: false, sortable: false, centered: true },
  { id: 'moveRow', header: 'Move', visibilityLabel: 'Move Row', defaultVisible: false, sortable: false, centered: true },
  { id: 'deleteRow', header: 'Del', visibilityLabel: 'Delete Row', defaultVisible: true, sortable: false, centered: true },
];

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

export const SONG_DIST_LINKS: readonly SongDistLink[] = [
  { label: '720', title: 'Open 720 link', field: 'HQ' },
  { label: '480', title: 'Open 480 link', field: 'MQ' },
  { label: 'MP3', title: 'Open MP3 link', field: 'audio' },
];

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

export function getColumnSortValue(
  song: SongRow,
  columnId: SongColumnId,
  language: AnimeTitleLanguage,
): SortableSongValue {
  switch (columnId) {
    case 'annId': return Number(song.annId ?? -1);
    case 'annSongId': return Number(song.annSongId ?? -1);
    case 'amqSongId': return Number(song.amqSongId ?? -1);
    case 'songType': return song.songType;
    case 'songName': return song.songName;
    case 'artist': return song.songArtist;
    case 'anime': return language === 'JP' ? song.animeJPName : song.animeENName;
    case 'season': {
      const parsed = parseVintage(song.animeVintage || '');
      return parsed.year === null ? -1 : parsed.year * 10 + parsed.seasonIndex;
    }
    case 'animeCategory': return song.animeCategory;
    case 'broadcast': return song.isDub && song.isRebroadcast ? 3 : song.isRebroadcast ? 2 : song.isDub ? 1 : 0;
    case 'performance': return song.songCategory;
    case 'difficulty': return Number(song.songDifficulty ?? -1);
    case 'length': return Number(song.songLength ?? -1);
    case 'composer': return song.songComposer;
    case 'arranger': return song.songArranger;
    default: return null;
  }
}

export function getColumnDisplayValue(
  song: SongRow,
  columnId: SongColumnId,
  language: AnimeTitleLanguage,
): string | number {
  switch (columnId) {
    case 'annId': return song.annId ?? '–';
    case 'annSongId': return song.annSongId != null && song.annSongId !== -1 ? song.annSongId : '–';
    case 'amqSongId': return song.amqSongId != null ? song.amqSongId : '–';
    case 'songType': return song.songType || '–';
    case 'songName': return song.songName || '–';
    case 'artist': return song.songArtist || '–';
    case 'anime': return language === 'JP' ? song.animeJPName : song.animeENName;
    case 'season': return getSeasonYearValue(song);
    case 'animeCategory': return song.animeCategory || '–';
    case 'broadcast': return getBroadcastLabel(song);
    case 'performance': return song.songCategory || '–';
    case 'difficulty': return song.songDifficulty != null ? `${song.songDifficulty}%` : '–';
    case 'length': return formatSongLength(song.songLength) || '–';
    case 'composer': return song.songComposer || '–';
    case 'arranger': return song.songArranger || '–';
    default: return '–';
  }
}

export function getColumnCopyValue(
  song: SongRow,
  columnId: SongColumnId,
  language: AnimeTitleLanguage,
): string {
  const display = getColumnDisplayValue(song, columnId, language);
  if (display === '–') return '';
  if (columnId === 'difficulty' && song.songDifficulty != null) return String(song.songDifficulty);
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
  let comparison = columnId === 'songType'
    ? compareSongTypes(left.songType, right.songType)
    : comparePrimitiveValues(
        getColumnSortValue(left, columnId, language),
        getColumnSortValue(right, columnId, language),
      );

  if (comparison === 0 && columnId === 'annId') {
    comparison = compareSongTypes(left.songType, right.songType);
  } else if (comparison === 0) {
    comparison = comparePrimitiveValues(left.annId, right.annId);
  }
  return comparison;
}
