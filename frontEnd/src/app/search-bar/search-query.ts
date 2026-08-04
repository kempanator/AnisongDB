import { AnimeType, BroadcastType, SearchCommand, SongCategory, SongLinkType, SongSearchBody, SongType } from '../core/models/search';

type IdField = 'ann_ids' | 'mal_ids' | 'ann_song_ids' | 'amq_song_ids' | 'artist_ids' | 'composer_ids';
const MAX_ID_SEARCH_COUNT = 500;
const MAX_RANDOM_SONG_COUNT = 500;
const ALL_SONG_LINK_TYPES: SongLinkType[] = ['audio', 'mq', 'hq'];

export type SearchMatchMode = 'partial' | 'exact' | 'partial-case' | 'exact-case';
export type AdvancedSearchFieldMode = 'text' | 'lookup';
export type SearchCombination = 'or' | 'and';
export type AdvancedLookupType = 'season' | 'ann-ids' | 'mal-ids' | 'ann-song-ids' | 'amq-song-ids' | 'random';

type ParsedIdListQuery = {
  field: IdField;
  ids: number[];
};

type SongTypeSelection = {
  openings: boolean;
  endings: boolean;
  inserts: boolean;
};

type AdvancedFilterSelection = SongTypeSelection & {
  normalBroadcasts: boolean;
  dubs: boolean;
  rebroadcasts: boolean;
  standards: boolean;
  characters: boolean;
  chantings: boolean;
  instrumentals: boolean;
  tv: boolean;
  movie: boolean;
  ova: boolean;
  ona: boolean;
  special: boolean;
  other: boolean;
  includeNoLinks: boolean;
};

type SimpleSearchFormState = {
  advanced: false;
  main: string;
  mainPartialMatch: boolean;
  ignoreDuplicate: boolean;
  filters: SongTypeSelection;
};

type AdvancedSearchFormState = {
  advanced: true;
  anime: string;
  songName: string;
  artist: string;
  composer: string;
  advancedSearchFieldMode: AdvancedSearchFieldMode;
  advancedLookupType: AdvancedLookupType;
  advancedLookupValue: string;
  seasonRangeStart: string;
  seasonRangeEnd: string;
  maximumOtherPeople: string;
  minimumGroupMembers: string;
  combination: SearchCombination;
  animeMatchMode: SearchMatchMode;
  songNameMatchMode: SearchMatchMode;
  artistMatchMode: SearchMatchMode;
  composerMatchMode: SearchMatchMode;
  composerArrangement: boolean;
  ignoreDuplicate: boolean;
  filters: AdvancedFilterSelection;
};

export type SearchFormState = SimpleSearchFormState | AdvancedSearchFormState;

function parseSeasonQuery(text: string): string | null {
  const match = text.trim().match(/^(winter|spring|summer|fall)\s*(\d{4})$/i);
  if (!match) return null;

  const season = match[1][0].toUpperCase() + match[1].slice(1).toLowerCase();
  return `${season} ${match[2]}`;
}

function parseIdListQuery(text: string): ParsedIdListQuery | null {
  const match = text.trim().match(/^(annid|malid|annsongid|amqsongid|artistid|composerid)\s+(.+)$/i);
  if (!match) return null;

  const ids = parseIdListValues(match[2]);
  if (!ids) return null;

  const fieldByKeyword: Record<string, IdField> = {
    annid: 'ann_ids',
    malid: 'mal_ids',
    annsongid: 'ann_song_ids',
    amqsongid: 'amq_song_ids',
    artistid: 'artist_ids',
    composerid: 'composer_ids',
  };
  return { field: fieldByKeyword[match[1].toLowerCase()], ids };
}

function parseIdListValues(text: string): number[] | null {
  const ids: number[] = [];
  const idOrRangePattern = /\d+(?:\s*-\s*\d+)?/g;
  let cursor = 0;

  for (const part of text.matchAll(idOrRangePattern)) {
    if (!/^[,\s]*$/.test(text.slice(cursor, part.index))) return null;

    const values = part[0].split(/\s*-\s*/).map(Number);
    if (values.some((value) => !Number.isSafeInteger(value))) return null;

    const [start, end = values[0]] = values;
    const rangeSize = Math.abs(end - start) + 1;
    if (ids.length + rangeSize > MAX_ID_SEARCH_COUNT) return null;

    const step = start <= end ? 1 : -1;
    for (let id = start; step === 1 ? id <= end : id >= end; id += step) {
      ids.push(id);
    }
    cursor = (part.index ?? 0) + part[0].length;
  }

  return ids.length && /^[,\s]*$/.test(text.slice(cursor)) ? ids : null;
}

function lookupValidationError(
  type: AdvancedLookupType,
  value: string,
): string | null {
  const input = value.trim();

  if (type === 'season') {
    return parseSeasonQuery(input)
      ? null
      : 'Enter a season like "Winter 2020".';
  }

  if (type === 'random') {
    const n = Number(input);
    return /^\d+$/.test(input) && n >= 1 && n <= MAX_RANDOM_SONG_COUNT
      ? null
      : `Enter a whole number from 1 to ${MAX_RANDOM_SONG_COUNT}.`;
  }

  if (parseIdListValues(input)) return null;

  const labelByType: Record<Exclude<AdvancedLookupType, 'season' | 'random'>, string> = {
    'ann-ids': 'ANN IDs',
    'mal-ids': 'MAL IDs',
    'ann-song-ids': 'ANN Song IDs',
    'amq-song-ids': 'AMQ Song IDs',
  };
  return `Enter up to ${MAX_ID_SEARCH_COUNT} ${labelByType[type]} using commas or ranges, like "1, 5-10, 25".`;
}

function advancedSearchValidationError(state: AdvancedSearchFormState): string | null {
  if (!isNonNegativeInteger(state.maximumOtherPeople)) {
    return 'Max Other People must be a whole number of 0 or greater.';
  }
  if (!isNonNegativeInteger(state.minimumGroupMembers)) {
    return 'Min Group Members must be a whole number of 0 or greater.';
  }
  if (!selectedSongTypes(state).length) {
    return 'At least one song type filter (OP, ED, INS) must be enabled.';
  }
  if (!selectedBroadcasts(state).length) {
    return 'At least one broadcast filter (Normal, Dubs, Rebroadcasts) must be enabled.';
  }
  if (!selectedSongCategories(state).length) {
    return 'At least one performance filter (Standard, Character, Chanting, Instrumental) must be enabled.';
  }
  if (!selectedAnimeTypes(state).length) {
    return 'At least one anime type filter (TV, Movie, OVA, ONA, Special, Other) must be enabled.';
  }
  if (state.seasonRangeStart.trim() && !parseSeasonQuery(state.seasonRangeStart)) {
    return 'Enter the From season like "Winter 2020".';
  }
  if (state.seasonRangeEnd.trim() && !parseSeasonQuery(state.seasonRangeEnd)) {
    return 'Enter the To season like "Fall 2024".';
  }

  if (state.advancedSearchFieldMode === 'lookup') {
    return lookupValidationError(
      state.advancedLookupType,
      state.advancedLookupValue,
    );
  }

  return state.anime.trim()
    || state.songName.trim()
    || state.artist.trim()
    || state.composer.trim()
    ? null
    : 'Enter at least one search term.';
}

export function searchValidationError(state: SearchFormState): string | null {
  if (state.advanced) {
    return advancedSearchValidationError(state);
  }
  return state.main.trim() ? null : 'Enter at least one search term.';
}

export function buildSearchCommand(
  state: SearchFormState,
  rankedActive: boolean,
): SearchCommand | null {
  if (searchValidationError(state)) return null;

  return state.advanced
    ? buildAdvancedSearchCommand(state)
    : buildSimpleSearchCommand(state, rankedActive);
}

function buildSimpleSearchCommand(
  state: SimpleSearchFormState,
  rankedActive: boolean,
): SearchCommand | null {
  const filters = { filters: { song_types: selectedSongTypes(state) } };
  const main = state.main.trim();

  const season = parseSeasonQuery(main);
  if (season) {
    return {
      kind: 'season',
      body: { season, ignore_duplicate: state.ignoreDuplicate, ...filters },
    };
  }

  const idList = parseIdListQuery(main);
  if (idList) {
    return idSearchCommand(idList, state.ignoreDuplicate, filters);
  }
  if (hasIdListKeyword(main)) return null;

  const textFilter = { search: main, partial_match: state.mainPartialMatch };

  return { kind: 'general', body: {
    anime_search_filter: textFilter,
    ...(!rankedActive && {
      song_name_search_filter: textFilter,
      artist_search_filter: textFilter,
      composer_search_filter: textFilter,
    }),
    // OR across fields; not exposed in simple UI; backend default is AND.
    and_logic: false,
    ignore_duplicate: state.ignoreDuplicate,
    ...filters,
  } };
}

function buildAdvancedSearchCommand(
  state: AdvancedSearchFormState,
): SearchCommand {
  const filters = buildAdvancedSongFilters(state);

  if (state.advancedSearchFieldMode === 'lookup') {
    return buildAdvancedLookupCommand(
      state.advancedLookupType,
      state.advancedLookupValue,
      state.ignoreDuplicate,
      filters,
    );
  }

  const anime = state.anime.trim();
  const songName = state.songName.trim();
  const artist = state.artist.trim();
  const composer = state.composer.trim();

  const minimumGroupMembers = Number(state.minimumGroupMembers);
  const maximumOtherPeople = Number(state.maximumOtherPeople);

  return { kind: 'general', body: {
    anime_search_filter: anime
      ? buildTextSearchFilter(anime, state.animeMatchMode)
      : undefined,
    song_name_search_filter: songName
      ? buildTextSearchFilter(songName, state.songNameMatchMode)
      : undefined,
    artist_search_filter: artist
      ? {
          ...buildTextSearchFilter(artist, state.artistMatchMode),
          group_granularity: minimumGroupMembers,
          max_other_artist: maximumOtherPeople,
        }
      : undefined,
    composer_search_filter: composer
      ? {
          ...buildTextSearchFilter(composer, state.composerMatchMode),
          arrangement: state.composerArrangement,
          group_granularity: minimumGroupMembers,
          max_other_artist: maximumOtherPeople,
        }
      : undefined,
    and_logic: state.combination === 'and',
    ignore_duplicate: state.ignoreDuplicate,
    ...filters,
  } };
}

// Only called after validation, so the parse results are non-null.
function buildAdvancedLookupCommand(
  type: AdvancedLookupType,
  value: string,
  ignoreDuplicate: boolean,
  filters: Pick<SongSearchBody, 'filters'>,
): SearchCommand {
  const input = value.trim();

  if (type === 'season') {
    return {
      kind: 'season',
      body: {
        season: parseSeasonQuery(input)!,
        ignore_duplicate: ignoreDuplicate,
        ...filters,
      },
    };
  }

  if (type === 'random') {
    return { kind: 'random', body: { n: Number(input), ...filters } };
  }

  const fieldByType: Record<Exclude<AdvancedLookupType, 'season' | 'random'>, IdField> = {
    'ann-ids': 'ann_ids',
    'mal-ids': 'mal_ids',
    'ann-song-ids': 'ann_song_ids',
    'amq-song-ids': 'amq_song_ids',
  };
  return idSearchCommand(
    { field: fieldByType[type], ids: parseIdListValues(input)! },
    ignoreDuplicate,
    filters,
  );
}

function selectedSongTypes(state: SearchFormState): SongType[] {
  const songTypes: SongType[] = [];
  if (state.filters.openings) songTypes.push('opening');
  if (state.filters.endings) songTypes.push('ending');
  if (state.filters.inserts) songTypes.push('insert');
  return songTypes;
}

function selectedBroadcasts(state: AdvancedSearchFormState): BroadcastType[] {
  const broadcasts: BroadcastType[] = [];
  if (state.filters.normalBroadcasts) broadcasts.push('normal');
  if (state.filters.dubs) broadcasts.push('dub');
  if (state.filters.rebroadcasts) broadcasts.push('rebroadcast');
  return broadcasts;
}

function selectedSongCategories(state: AdvancedSearchFormState): SongCategory[] {
  const songCategories: SongCategory[] = [];
  // UI "Standard" also includes Other (No Category / uncategorized); no separate Other control.
  if (state.filters.standards) songCategories.push('standard', 'other');
  if (state.filters.instrumentals) songCategories.push('instrumental');
  if (state.filters.chantings) songCategories.push('chanting');
  if (state.filters.characters) songCategories.push('character');
  return songCategories;
}

function selectedAnimeTypes(state: AdvancedSearchFormState): AnimeType[] {
  const animeTypes: AnimeType[] = [];
  if (state.filters.tv) animeTypes.push('tv');
  if (state.filters.movie) animeTypes.push('movie');
  if (state.filters.ova) animeTypes.push('ova');
  if (state.filters.ona) animeTypes.push('ona');
  if (state.filters.special) animeTypes.push('special');
  if (state.filters.other) animeTypes.push('other');
  return animeTypes;
}

function buildAdvancedSongFilters(state: AdvancedSearchFormState): Pick<
  SongSearchBody,
  'filters'
> {
  const start = normalizeSeasonBound(state.seasonRangeStart);
  const end = normalizeSeasonBound(state.seasonRangeEnd);

  return {
    filters: {
      song_types: selectedSongTypes(state),
      broadcasts: selectedBroadcasts(state),
      song_categories: selectedSongCategories(state),
      anime_types: selectedAnimeTypes(state),
      season: start || end ? { start, end } : undefined,
      media_links: state.filters.includeNoLinks
        ? undefined
        : { require_any: [...ALL_SONG_LINK_TYPES] },
    },
  };
}

function normalizeSeasonBound(value: string): string | undefined {
  return parseSeasonQuery(value) ?? undefined;
}

function hasIdListKeyword(text: string): boolean {
  return /^(annid|malid|annsongid|amqsongid|artistid|composerid)\s+/i.test(text.trim());
}

function buildTextSearchFilter(search: string, matchMode: SearchMatchMode) {
  return {
    search,
    partial_match: matchMode === 'partial' || matchMode === 'partial-case',
    match_case: matchMode === 'partial-case' || matchMode === 'exact-case',
  };
}

function idSearchCommand(
  query: ParsedIdListQuery,
  ignoreDuplicate: boolean,
  filters: Pick<SongSearchBody, 'filters'>,
): SearchCommand {
  const body = { ignore_duplicate: ignoreDuplicate, ...filters };

  switch (query.field) {
    case 'ann_ids':
      return { kind: 'ann-ids', body: { ...body, ann_ids: query.ids } };
    case 'mal_ids':
      return { kind: 'mal-ids', body: { ...body, mal_ids: query.ids } };
    case 'ann_song_ids':
      return { kind: 'ann-song-ids', body: { ...body, ann_song_ids: query.ids } };
    case 'amq_song_ids':
      return { kind: 'amq-song-ids', body: { ...body, amq_song_ids: query.ids } };
    case 'artist_ids':
      return { kind: 'artist-ids', body: { ...body, artist_ids: query.ids } };
    case 'composer_ids':
      return { kind: 'composer-ids', body: { ...body, composer_ids: query.ids } };
  }
}

function isNonNegativeInteger(value: string): boolean {
  const input = value.trim();
  const number = Number(input);
  return /^\d+$/.test(input) && Number.isSafeInteger(number);
}
