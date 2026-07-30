import { DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';
import { UserPreferencesService } from './user-preferences.service';

export type ThemeId = 'classic' | 'dark' | 'light';

type ThemeMeta = {
  id: ThemeId;
  label: string;
};

const DEFAULT_THEME: ThemeId = 'classic';

const THEMES: readonly ThemeMeta[] = [
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
];

const THEME_ID_SET = new Set<string>(THEMES.map((theme) => theme.id));

function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && THEME_ID_SET.has(value);
}

function resolveThemeId(value: unknown): ThemeId {
  return isThemeId(value) ? value : DEFAULT_THEME;
}

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly preferences = inject(UserPreferencesService);
  private readonly document = inject(DOCUMENT);
  private readonly themeSignal = signal<ThemeId>(this.loadInitialTheme());
  readonly theme = this.themeSignal.asReadonly();
  readonly availableThemes = THEMES;

  constructor() {
    effect(() => {
      this.applyTheme(this.themeSignal());
    });
  }

  setTheme(theme: ThemeId): void {
    if (!isThemeId(theme)) {
      return;
    }

    this.preferences.updateStoredValues({ theme });
    this.themeSignal.set(theme);
  }

  resetTheme(): void {
    this.preferences.removeStoredValues('theme');
    this.themeSignal.set(DEFAULT_THEME);
  }

  private loadInitialTheme(): ThemeId {
    return resolveThemeId(this.preferences.getStoredValue('theme'));
  }

  private applyTheme(theme: ThemeId): void {
    this.document.documentElement.dataset['theme'] = theme;
  }
}
