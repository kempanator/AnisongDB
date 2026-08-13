import { parseNonNegativeInteger } from '../core/utils/number';
import { parseAnimeSeason } from '../core/utils/song-metadata';
import { AnimeType, BroadcastType, SearchCommand, SongCategory, SongLinkType, SongSearchBody, SongType } from './search';

const MAX_ID_SEARCH_COUNT = 500;
const MAX_RANDOM_SONG_COUNT = 500;
const ALL_SONG_LINK_TYPES: SongLinkType[] = ['audio', 'mq', 'hq'];

export const SEARCH_MATCH_MODE_OPTIONS = [
  { value: 'partial', label: 'Partial Match' },
  { value: 'exact', label: 'Exact Match' },
  { value: 'partial-case', label: 'Partial + Case' },
  { value: 'exact-case', label: 'Exact + Case' },
] as const;

export type SearchMatchMode = typeof SEARCH_MATCH_MODE_OPTIONS[number]['value'];
export type AdvancedSearchFieldMode = 'text' | 'lookup';
export type SearchCombination = 'or' | 'and';

type IdSearchBody = Pick<SongSearchBody, 'filters' | 'ignore_duplicate'>;

type IdSearchDefinition = {
  keyword: string;
  value: string;
  label: string;
  placeholder: string;
  inputMode: 'numeric' | null;
  errorLabel: string;
  advancedLookup: boolean;
  buildCommand: (ids: number[], body: IdSearchBody) => SearchCommand;
};

const ID_SEARCH_CONFIG = [
  {
    keyword: 'annid',
    value: 'ann-ids',
    label: 'ANN ID',
    placeholder: '1, 2, 3',
    inputMode: null,
    errorLabel: 'ANN IDs',
    advancedLookup: true,
    buildCommand: (ids, body) => ({ kind: 'ann-ids', body: { ...body, ann_ids: ids } }),
  },
  {
    keyword: 'malid',
    value: 'mal-ids',
    label: 'MAL ID',
    placeholder: '1, 2, 3',
    inputMode: null,
    errorLabel: 'MAL IDs',
    advancedLookup: true,
    buildCommand: (ids, body) => ({ kind: 'mal-ids', body: { ...body, mal_ids: ids } }),
  },
  {
    keyword: 'annsongid',
    value: 'ann-song-ids',
    label: 'ANN Song ID',
    placeholder: '1, 2, 3',
    inputMode: null,
    errorLabel: 'ANN Song IDs',
    advancedLookup: true,
    buildCommand: (ids, body) => ({ kind: 'ann-song-ids', body: { ...body, ann_song_ids: ids } }),
  },
  {
    keyword: 'amqsongid',
    value: 'amq-song-ids',
    label: 'AMQ Song ID',
    placeholder: '1, 2, 3',
    inputMode: null,
    errorLabel: 'AMQ Song IDs',
    advancedLookup: true,
    buildCommand: (ids, body) => ({ kind: 'amq-song-ids', body: { ...body, amq_song_ids: ids } }),
  },
  {
    keyword: 'artistid',
    value: 'artist-ids',
    label: 'Artist ID',
    placeholder: '1, 2, 3',
    inputMode: null,
    errorLabel: 'artist IDs',
    advancedLookup: false,
    buildCommand: (ids, body) => ({ kind: 'artist-ids', body: { ...body, artist_ids: ids } }),
  },
  {
    keyword: 'composerid',
    value: 'composer-ids',
    label: 'Composer ID',
    placeholder: '1, 2, 3',
    inputMode: null,
    errorLabel: 'composer IDs',
    advancedLookup: false,
    buildCommand: (ids, body) => ({ kind: 'composer-ids', body: { ...body, composer_ids: ids } }),
  },
] as const satisfies readonly IdSearchDefinition[];

const SEASON_LOOKUP_OPTION = {
  value: 'season',
  label: 'Season',
  placeholder: 'Winter 2020',
  inputMode: null,
} as const;

const RANDOM_LOOKUP_OPTION = {
  value: 'random',
  label: 'Random # Songs',
  placeholder: '#',
  inputMode: 'numeric',
} as const;

type AdvancedIdSearchDefinition = Extract<
  typeof ID_SEARCH_CONFIG[number],
  { advancedLookup: true }
>;

const ADVANCED_ID_LOOKUP_OPTIONS = ID_SEARCH_CONFIG.filter(
  (config): config is AdvancedIdSearchDefinition => config.advancedLookup,
);

export const ADVANCED_LOOKUP_OPTIONS = [
  SEASON_LOOKUP_OPTION,
  ...ADVANCED_ID_LOOKUP_OPTIONS,
  RANDOM_LOOKUP_OPTION,
] as const;

export type AdvancedLookupType = typeof ADVANCED_LOOKUP_OPTIONS[number]['value'];

export function getAdvancedLookupOption(type: AdvancedLookupType) {
  return ADVANCED_LOOKUP_OPTIONS.find((option) => option.value === type)
    ?? SEASON_LOOKUP_OPTION;
}

type ParsedIdListQuery = {
  config: IdSearchDefinition;
  ids: number[];
};

export type SearchFilterSelection = {
  openings: boolean;
  endings: boolean;
  inserts: boolean;
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

export type SearchFormState = {
  main: string;
  mainPartialMatch: boolean;
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
  filters: SearchFilterSelection;
};

export type SearchCommandBuildResult =
  | { command: SearchCommand }
  | { error: string };

export function createDefaultSearchFormState(): SearchFormState {
  return {
    main: '',
    mainPartialMatch: true,
    anime: '',
    songName: '',
    artist: '',
    composer: '',
    advancedSearchFieldMode: 'text',
    advancedLookupType: 'season',
    advancedLookupValue: '',
    seasonRangeStart: '',
    seasonRangeEnd: '',
    maximumOtherPeople: '99',
    minimumGroupMembers: '0',
    combination: 'or',
    animeMatchMode: 'partial',
    songNameMatchMode: 'partial',
    artistMatchMode: 'partial',
    composerMatchMode: 'partial',
    composerArrangement: true,
    ignoreDuplicate: false,
    filters: {
      openings: true,
      endings: true,
      inserts: true,
      normalBroadcasts: true,
      dubs: true,
      rebroadcasts: true,
      standards: true,
      characters: true,
      chantings: true,
      instrumentals: true,
      tv: true,
      movie: true,
      ova: true,
      ona: true,
      special: true,
      other: true,
      includeNoLinks: true,
    },
  };
}

function parseSeasonQuery(text: string): string | null {
  return parseAnimeSeason(text)?.label ?? null;
}

function parseIdListQuery(text: string): ParsedIdListQuery | null {
  const match = text.trim().match(/^(\S+)\s+(.+)$/);
  if (!match) return null;

  const config = ID_SEARCH_CONFIG.find(
    (candidate) => candidate.keyword === match[1].toLowerCase(),
  );
  if (!config) return null;

  const ids = parseIdListValues(match[2]);
  if (!ids) return null;

  return { config, ids };
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

export function buildSearchCommand(
  state: SearchFormState,
  advanced: boolean,
  rankedActive: boolean,
): SearchCommandBuildResult {
  return advanced
    ? buildAdvancedSearchCommand(state)
    : buildSimpleSearchCommand(state, rankedActive);
}

function buildSimpleSearchCommand(
  state: SearchFormState,
  rankedActive: boolean,
): SearchCommandBuildResult {
  const main = state.main.trim();
  if (!main) return invalidSearch('Enter at least one search term.');

  const filters = { filters: { song_types: selectedSongTypes(state) } };
  const season = parseSeasonQuery(main);
  if (season) {
    return validSearch({
      kind: 'season',
      body: { season, ignore_duplicate: state.ignoreDuplicate, ...filters },
    });
  }

  const idList = parseIdListQuery(main);
  if (idList) {
    return validSearch(idSearchCommand(idList, state.ignoreDuplicate, filters));
  }
  if (hasIdListKeyword(main)) {
    return invalidSearch(idListError('IDs'));
  }

  const textFilter = { search: main, partial_match: state.mainPartialMatch };
  return validSearch({ kind: 'general', body: {
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
  } });
}

function buildAdvancedSearchCommand(
  state: SearchFormState,
): SearchCommandBuildResult {
  if (!isNonNegativeInteger(state.maximumOtherPeople)) {
    return invalidSearch('Max Other People must be a whole number of 0 or greater.');
  }
  if (!isNonNegativeInteger(state.minimumGroupMembers)) {
    return invalidSearch('Min Group Members must be a whole number of 0 or greater.');
  }

  const songTypes = selectedSongTypes(state);
  const broadcasts = selectedBroadcasts(state);
  const songCategories = selectedSongCategories(state);
  const animeTypes = selectedAnimeTypes(state);
  if (!songTypes.length) {
    return invalidSearch('At least one song type filter (OP, ED, INS) must be enabled.');
  }
  if (!broadcasts.length) {
    return invalidSearch('At least one broadcast filter (Normal, Dubs, Rebroadcasts) must be enabled.');
  }
  if (!songCategories.length) {
    return invalidSearch('At least one performance filter (Standard, Character, Chanting, Instrumental) must be enabled.');
  }
  if (!animeTypes.length) {
    return invalidSearch('At least one anime type filter (TV, Movie, OVA, ONA, Special, Other) must be enabled.');
  }

  const seasonStartInput = state.seasonRangeStart.trim();
  const seasonEndInput = state.seasonRangeEnd.trim();
  const seasonStart = seasonStartInput ? parseSeasonQuery(seasonStartInput) : undefined;
  const seasonEnd = seasonEndInput ? parseSeasonQuery(seasonEndInput) : undefined;
  if (seasonStartInput && !seasonStart) {
    return invalidSearch('Enter the From season like "Winter 2020".');
  }
  if (seasonEndInput && !seasonEnd) {
    return invalidSearch('Enter the To season like "Fall 2024".');
  }

  const filters: Pick<SongSearchBody, 'filters'> = {
    filters: {
      song_types: songTypes,
      broadcasts,
      song_categories: songCategories,
      anime_types: animeTypes,
      season: seasonStart || seasonEnd
        ? { start: seasonStart ?? undefined, end: seasonEnd ?? undefined }
        : undefined,
      media_links: state.filters.includeNoLinks
        ? undefined
        : { require_any: [...ALL_SONG_LINK_TYPES] },
    },
  };

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
  if (!anime && !songName && !artist && !composer) {
    return invalidSearch('Enter at least one search term.');
  }

  const minimumGroupMembers = Number(state.minimumGroupMembers);
  const maximumOtherPeople = Number(state.maximumOtherPeople);

  return validSearch({ kind: 'general', body: {
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
  } });
}

function buildAdvancedLookupCommand(
  type: AdvancedLookupType,
  value: string,
  ignoreDuplicate: boolean,
  filters: Pick<SongSearchBody, 'filters'>,
): SearchCommandBuildResult {
  const input = value.trim();

  if (type === 'season') {
    const season = parseSeasonQuery(input);
    return season ? validSearch({
      kind: 'season',
      body: {
        season,
        ignore_duplicate: ignoreDuplicate,
        ...filters,
      },
    }) : invalidSearch('Enter a season like "Winter 2020".');
  }

  if (type === 'random') {
    const count = Number(input);
    return /^\d+$/.test(input) && count >= 1 && count <= MAX_RANDOM_SONG_COUNT
      ? validSearch({ kind: 'random', body: { n: count, ...filters } })
      : invalidSearch(`Enter a whole number from 1 to ${MAX_RANDOM_SONG_COUNT}.`);
  }

  const config = ID_SEARCH_CONFIG.find((candidate) => candidate.value === type);
  if (!config) return invalidSearch('Choose a valid lookup field.');

  const ids = parseIdListValues(input);
  return ids ? validSearch(idSearchCommand(
    { config, ids },
    ignoreDuplicate,
    filters,
  )) : invalidSearch(idListError(config.errorLabel));
}

function validSearch(command: SearchCommand): SearchCommandBuildResult {
  return { command };
}

function invalidSearch(error: string): SearchCommandBuildResult {
  return { error };
}

function idListError(label: string): string {
  return `Enter up to ${MAX_ID_SEARCH_COUNT} ${label} using commas or ranges, like "1, 5-10, 25".`;
}

function selectedSongTypes(state: SearchFormState): SongType[] {
  const songTypes: SongType[] = [];
  if (state.filters.openings) songTypes.push('opening');
  if (state.filters.endings) songTypes.push('ending');
  if (state.filters.inserts) songTypes.push('insert');
  return songTypes;
}

function selectedBroadcasts(state: SearchFormState): BroadcastType[] {
  const broadcasts: BroadcastType[] = [];
  if (state.filters.normalBroadcasts) broadcasts.push('normal');
  if (state.filters.dubs) broadcasts.push('dub');
  if (state.filters.rebroadcasts) broadcasts.push('rebroadcast');
  return broadcasts;
}

function selectedSongCategories(state: SearchFormState): SongCategory[] {
  const songCategories: SongCategory[] = [];
  // UI "Standard" also includes Other (No Category / uncategorized); no separate Other control.
  if (state.filters.standards) songCategories.push('standard', 'other');
  if (state.filters.instrumentals) songCategories.push('instrumental');
  if (state.filters.chantings) songCategories.push('chanting');
  if (state.filters.characters) songCategories.push('character');
  return songCategories;
}

function selectedAnimeTypes(state: SearchFormState): AnimeType[] {
  const animeTypes: AnimeType[] = [];
  if (state.filters.tv) animeTypes.push('tv');
  if (state.filters.movie) animeTypes.push('movie');
  if (state.filters.ova) animeTypes.push('ova');
  if (state.filters.ona) animeTypes.push('ona');
  if (state.filters.special) animeTypes.push('special');
  if (state.filters.other) animeTypes.push('other');
  return animeTypes;
}

function hasIdListKeyword(text: string): boolean {
  const match = text.trim().match(/^(\S+)\s+/);
  return !!match && ID_SEARCH_CONFIG.some(
    (config) => config.keyword === match[1].toLowerCase(),
  );
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
  return query.config.buildCommand(query.ids, body);
}

function isNonNegativeInteger(value: string): boolean {
  const input = value.trim();
  return /^\d+$/.test(input) && parseNonNegativeInteger(input) !== null;
}
