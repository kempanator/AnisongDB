import { SongCredit } from '../core/models/song';

export type { SongRow, SortableSongValue } from '../core/models/song';

export type StatBreakdownEntry = {
  label: string;
  count: number;
  percent: number;
};

export type StatRankingEntry = {
  key: string;
  label: string;
  count: number;
};

export type TableStatsBreakdown = Record<string, number>;

export type TableStats = {
  songCount: number;
  uniqueAnime: number;
  uniqueArtists: number;
  avgDifficulty: number;
  avgLength: number | null;
  animeTypeBreakdown: StatBreakdownEntry[];
  songTypeBreakdown: StatBreakdownEntry[];
  broadcastBreakdown: StatBreakdownEntry[];
  performanceBreakdown: StatBreakdownEntry[];
  topAnime: StatRankingEntry[];
  topArtists: StatRankingEntry[];
  difficultyBreakdown: StatBreakdownEntry[];
};

export const EMPTY_TABLE_STATS: TableStats = {
  songCount: 0,
  uniqueAnime: 0,
  uniqueArtists: 0,
  avgDifficulty: 0,
  avgLength: null,
  animeTypeBreakdown: [],
  songTypeBreakdown: [],
  broadcastBreakdown: [],
  performanceBreakdown: [],
  topAnime: [],
  topArtists: [],
  difficultyBreakdown: [],
};

export type CreditPerson = SongCredit;

export type CreditSearchRole = 'artist' | 'composer';

export type CreditSection = {
  title: string;
  people: CreditPerson[];
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
