import { Injectable, signal } from '@angular/core';

export type SearchModePreference = 'simple' | 'advanced';
export type AnimeTitleLanguage = 'EN' | 'JP';
export type RadioMode = 'none' | 'repeat' | 'loop-all';

export type UserPreferences = {
  searchMode: SearchModePreference;
  animeTitleLanguage: AnimeTitleLanguage;
  showAnimeLanguageToggle: boolean;
  showAmqSongId: boolean;
  radioMode: RadioMode;
};

export type StoredUserPreferences = Record<string, unknown>;

const STORAGE_KEY = 'userPreferences';

const DEFAULT_PREFERENCES: UserPreferences = {
  searchMode: 'simple',
  animeTitleLanguage: 'JP',
  showAnimeLanguageToggle: true,
  showAmqSongId: false,
  radioMode: 'none',
};

const PREFERENCE_KEYS: ReadonlyArray<keyof UserPreferences> = [
  'searchMode',
  'animeTitleLanguage',
  'showAnimeLanguageToggle',
  'showAmqSongId',
  'radioMode',
];

@Injectable({
  providedIn: 'root',
})
export class UserPreferencesService {
  private readonly preferencesSignal = signal<UserPreferences>(
    this.loadPreferences(),
  );
  readonly preferences = this.preferencesSignal.asReadonly();

  updatePreferences(preferences: Partial<UserPreferences>): void {
    const next = {
      ...this.preferencesSignal(),
      ...preferences,
    };

    this.savePreferences(next);
    this.preferencesSignal.set(next);
  }

  resetPreferences(): void {
    this.removeStoredValues(...PREFERENCE_KEYS);
    this.preferencesSignal.set(DEFAULT_PREFERENCES);
  }

  readStoredPreferences(): StoredUserPreferences {
    try {
      const rawValue = localStorage.getItem(STORAGE_KEY);
      if (!rawValue) return {};

      const value: unknown = JSON.parse(rawValue);
      return value && typeof value === 'object' && !Array.isArray(value)
        ? value as StoredUserPreferences
        : {};
    } catch {
      return {};
    }
  }

  getStoredValue(key: string): unknown {
    return this.readStoredPreferences()[key];
  }

  updateStoredValues(values: StoredUserPreferences): void {
    this.writeStoredPreferences({
      ...this.readStoredPreferences(),
      ...values,
    });
  }

  removeStoredValues(...keys: string[]): void {
    const values = this.readStoredPreferences();
    for (const key of keys) delete values[key];

    if (Object.keys(values).length) {
      this.writeStoredPreferences(values);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  replaceStoredPreferences(values: StoredUserPreferences): void {
    this.writeStoredPreferences(values);
  }

  clearStoredPreferences(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  private loadPreferences(): UserPreferences {
    return {
      ...DEFAULT_PREFERENCES,
      ...this.readSavedPreferences(),
    };
  }

  private readSavedPreferences(): Partial<UserPreferences> {
    const value = this.readStoredPreferences();
    const saved: Partial<UserPreferences> = {};

    if (this.isSearchMode(value.searchMode)) {
      saved.searchMode = value.searchMode;
    }
    if (this.isAnimeTitleLanguage(value.animeTitleLanguage)) {
      saved.animeTitleLanguage = value.animeTitleLanguage;
    }
    if (typeof value.showAnimeLanguageToggle === 'boolean') {
      saved.showAnimeLanguageToggle = value.showAnimeLanguageToggle;
    }
    if (typeof value.showAmqSongId === 'boolean') {
      saved.showAmqSongId = value.showAmqSongId;
    }
    if (this.isRadioMode(value.radioMode)) {
      saved.radioMode = value.radioMode;
    }

    return saved;
  }

  private savePreferences(preferences: UserPreferences): void {
    this.updateStoredValues(preferences);
  }

  private writeStoredPreferences(values: StoredUserPreferences): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  }

  private isSearchMode(value: unknown): value is SearchModePreference {
    return value === 'simple' || value === 'advanced';
  }

  private isAnimeTitleLanguage(value: unknown): value is AnimeTitleLanguage {
    return value === 'EN' || value === 'JP';
  }

  private isRadioMode(value: unknown): value is RadioMode {
    return value === 'none' || value === 'repeat' || value === 'loop-all';
  }
}
