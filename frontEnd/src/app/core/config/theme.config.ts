export type ThemeId = 'default' | 'light';

export type ThemeTokens = {
  primaryColor: string;
  secondaryColor: string;
  songTableHoverColor: string;
  songTableImpairColor: string;
  songTablePairColor: string;
  tableFontColor: string;
  textOnPrimary: string;
  textOnSecondary: string;
  background: string;
  textOnBackground: string;
  linkOnBackground: string;
  accentColor: string;
  accentColorHover: string;
  accentColorGlow: string;
  primaryVidstackColor: string;
};

export type ThemeInfo = {
  label: string;
  tokens?: ThemeTokens;
};

export const THEME_TOKEN_KEYS = [
  'primaryColor',
  'secondaryColor',
  'songTableHoverColor',
  'songTableImpairColor',
  'songTablePairColor',
  'tableFontColor',
  'textOnPrimary',
  'textOnSecondary',
  'background',
  'textOnBackground',
  'linkOnBackground',
  'accentColor',
  'accentColorHover',
  'accentColorGlow',
  'primaryVidstackColor',
] as const satisfies ReadonlyArray<keyof ThemeTokens>;

export const THEMES: Record<ThemeId, ThemeInfo> = {
  default: {
    label: 'Default',
  },
  light: {
    label: 'Light',
    tokens: {
      primaryColor: '#1976d2',
      secondaryColor: '#666',
      songTableHoverColor: '#ddd',
      songTableImpairColor: '#f2f2f2',
      songTablePairColor: 'white',
      tableFontColor: 'black',
      textOnPrimary: 'white',
      textOnSecondary: 'black',
      background: 'white',
      textOnBackground: 'black',
      linkOnBackground: 'blue',
      accentColor: 'rgb(226, 148, 4)',
      accentColorHover: 'rgb(244, 168, 24)',
      accentColorGlow: 'rgba(226, 148, 4, 0.35)',
      primaryVidstackColor: '#e0e0e0',
    },
  },
};

export const THEME_IDS = Object.keys(THEMES) as ThemeId[];
