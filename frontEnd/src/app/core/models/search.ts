export type SongId = string | number;

export interface TextSearchFilter {
  search: string;
  partial_match?: boolean;
  match_case?: boolean;
}

export interface PersonSearchFilter extends TextSearchFilter {
  group_granularity?: number;
  max_other_artist?: number;
  arrangement?: boolean;
}

export type SongLinkType = 'audio' | 'mq' | 'hq';

export interface MediaLinksFilter {
  require_any?: SongLinkType[];
  require_all?: SongLinkType[];
  exclude?: SongLinkType[];
}

export type SongType = 'opening' | 'ending' | 'insert';
export type BroadcastType = 'normal' | 'dub' | 'rebroadcast';
export type SongCategory = 'standard' | 'character' | 'chanting' | 'instrumental' | 'other';
export type AnimeType = 'tv' | 'movie' | 'ova' | 'ona' | 'special' | 'other';

export interface SeasonFilter {
  start?: string;
  end?: string;
}

export interface SongSearchFilters {
  song_types?: SongType[];
  broadcasts?: BroadcastType[];
  song_categories?: SongCategory[];
  anime_types?: AnimeType[];
  season?: SeasonFilter;
  media_links?: MediaLinksFilter;
}

export interface SongSearchBody {
  type?: 'initial_random_songs';
  n?: number;
  season?: string;
  ann_ids?: SongId[];
  mal_ids?: SongId[];
  ann_song_ids?: SongId[];
  amq_song_ids?: SongId[];
  artist_ids?: number[];
  composer_ids?: number[];
  group_granularity?: number;
  max_other_artist?: number;
  arrangement?: boolean;
  anime_search_filter?: TextSearchFilter;
  song_name_search_filter?: TextSearchFilter;
  artist_search_filter?: PersonSearchFilter;
  composer_search_filter?: PersonSearchFilter;
  and_logic?: boolean;
  ignore_duplicate?: boolean;
  filters?: SongSearchFilters;
}

type SearchBodyWith<TKey extends keyof SongSearchBody> = SongSearchBody
  & Required<Pick<SongSearchBody, TKey>>;

/** Identifies the search operation independently from its API payload. */
export type SearchCommand =
  | { kind: 'initial-random'; body: SearchBodyWith<'type'> }
  | { kind: 'random'; body: SearchBodyWith<'n'> }
  | { kind: 'general'; body: SongSearchBody }
  | { kind: 'season'; body: SearchBodyWith<'season'> }
  | { kind: 'ann-ids'; body: SearchBodyWith<'ann_ids'> }
  | { kind: 'mal-ids'; body: SearchBodyWith<'mal_ids'> }
  | { kind: 'ann-song-ids'; body: SearchBodyWith<'ann_song_ids'> }
  | { kind: 'amq-song-ids'; body: SearchBodyWith<'amq_song_ids'> }
  | { kind: 'artist-ids'; body: SearchBodyWith<'artist_ids'> }
  | { kind: 'composer-ids'; body: SearchBodyWith<'composer_ids'> };
