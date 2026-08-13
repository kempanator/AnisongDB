type PreferenceOption<Id extends string> = {
  id: Id;
  label: string;
};

export const SEARCH_MODE_OPTIONS = [
  {
    id: 'simple',
    label: 'Simple',
  },
  {
    id: 'advanced',
    label: 'Advanced',
  },
] as const satisfies readonly PreferenceOption<string>[];

export type SearchModePreference = typeof SEARCH_MODE_OPTIONS[number]['id'];

export const ANIME_TITLE_LANGUAGE_OPTIONS = [
  {
    id: 'EN',
    label: 'EN',
  },
  {
    id: 'JP',
    label: 'JP',
  },
] as const satisfies readonly PreferenceOption<string>[];

export type AnimeTitleLanguage = typeof ANIME_TITLE_LANGUAGE_OPTIONS[number]['id'];

export const RADIO_MODE_OPTIONS = [
  {
    id: 'none',
    label: 'None',
  },
  {
    id: 'repeat',
    label: 'Repeat',
  },
  {
    id: 'loop-all',
    label: 'Loop all',
  },
] as const satisfies readonly PreferenceOption<string>[];

export type RadioMode = typeof RADIO_MODE_OPTIONS[number]['id'];

export const THEME_OPTIONS = [
  {
    id: 'classic',
    label: 'Classic',
  },
  {
    id: 'dark',
    label: 'Dark',
  },
  {
    id: 'light',
    label: 'Light',
  },
] as const satisfies readonly PreferenceOption<string>[];

export type ThemeId = typeof THEME_OPTIONS[number]['id'];

type DistServerConfig = PreferenceOption<string> & {
  baseUrl: string;
};

export const DIST_SERVER_OPTIONS = [
  {
    id: 'nawdist',
    label: 'North America West',
    baseUrl: 'https://nawdist.animemusicquiz.com/',
  },
  {
    id: 'naedist',
    label: 'North America East',
    baseUrl: 'https://naedist.animemusicquiz.com/',
  },
  {
    id: 'eudist',
    label: 'Europe',
    baseUrl: 'https://eudist.animemusicquiz.com/',
  },
] as const satisfies readonly DistServerConfig[];

export type DistServerOption = typeof DIST_SERVER_OPTIONS[number];
export type DistServer = typeof DIST_SERVER_OPTIONS[number]['id'];

export type UserPreferences = {
  searchMode: SearchModePreference;
  animeTitleLanguage: AnimeTitleLanguage;
  showAnimeLanguageToggle: boolean;
  showAmqSongId: boolean;
  radioMode: RadioMode;
  theme: ThemeId;
  distServer: DistServer;
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  searchMode: 'simple',
  animeTitleLanguage: 'JP',
  showAnimeLanguageToggle: true,
  showAmqSongId: false,
  radioMode: 'none',
  theme: 'classic',
  distServer: 'naedist',
};

export const USER_PREFERENCE_KEYS = Object.keys(
  DEFAULT_USER_PREFERENCES,
) as (keyof UserPreferences)[];

export function normalizeUserPreferences(
  values: Record<string, unknown>,
): UserPreferences {
  return {
    searchMode: isOptionId(SEARCH_MODE_OPTIONS, values['searchMode'])
      ? values['searchMode']
      : DEFAULT_USER_PREFERENCES.searchMode,
    animeTitleLanguage: isOptionId(
      ANIME_TITLE_LANGUAGE_OPTIONS,
      values['animeTitleLanguage'],
    )
      ? values['animeTitleLanguage']
      : DEFAULT_USER_PREFERENCES.animeTitleLanguage,
    showAnimeLanguageToggle: typeof values['showAnimeLanguageToggle'] === 'boolean'
      ? values['showAnimeLanguageToggle']
      : DEFAULT_USER_PREFERENCES.showAnimeLanguageToggle,
    showAmqSongId: typeof values['showAmqSongId'] === 'boolean'
      ? values['showAmqSongId']
      : DEFAULT_USER_PREFERENCES.showAmqSongId,
    radioMode: isOptionId(RADIO_MODE_OPTIONS, values['radioMode'])
      ? values['radioMode']
      : DEFAULT_USER_PREFERENCES.radioMode,
    theme: isOptionId(THEME_OPTIONS, values['theme'])
      ? values['theme']
      : DEFAULT_USER_PREFERENCES.theme,
    distServer: isOptionId(DIST_SERVER_OPTIONS, values['distServer'])
      ? values['distServer']
      : DEFAULT_USER_PREFERENCES.distServer,
  };
}

export function getDistServerOption(server: DistServer): DistServerOption {
  const option = DIST_SERVER_OPTIONS.find((candidate) => candidate.id === server);
  if (!option) throw new RangeError(`Unknown distribution server: ${server}`);
  return option;
}

function isOptionId<Id extends string>(
  options: readonly PreferenceOption<Id>[],
  value: unknown,
): value is Id {
  return typeof value === 'string'
    && options.some((option) => option.id === value);
}
