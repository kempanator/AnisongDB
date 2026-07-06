import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  THEME_IDS,
  THEME_TOKEN_KEYS,
  THEMES,
  ThemeId,
  ThemeInfo,
} from '../config/theme.config';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly storageKey = 'appTheme';
  private readonly defaultTheme: ThemeId = 'default';

  private readonly themeSubject: BehaviorSubject<ThemeId>;
  readonly theme$: Observable<ThemeId>;

  constructor(@Inject(DOCUMENT) private readonly document: Document) {
    const saved = localStorage.getItem(this.storageKey);
    const initial = this.isThemeId(saved) ? saved : this.defaultTheme;
    this.themeSubject = new BehaviorSubject(initial);
    this.theme$ = this.themeSubject.asObservable();
    this.applyTheme(initial);
  }

  getTheme(): ThemeId {
    return this.themeSubject.value;
  }

  setTheme(theme: ThemeId): void {
    if (!this.isThemeId(theme)) {
      return;
    }

    localStorage.setItem(this.storageKey, theme);
    this.applyTheme(theme);
    this.themeSubject.next(theme);
  }

  getThemeInfo(theme: ThemeId = this.getTheme()): ThemeInfo {
    return THEMES[theme];
  }

  readonly availableThemes = THEME_IDS;

  private applyTheme(theme: ThemeId): void {
    const root = this.document.documentElement;
    const tokens = THEMES[theme].tokens;

    if (!tokens) {
      for (const key of THEME_TOKEN_KEYS) {
        root.style.removeProperty(`--${key}`);
      }
      return;
    }

    for (const key of THEME_TOKEN_KEYS) {
      root.style.setProperty(`--${key}`, tokens[key]);
    }
  }

  private isThemeId(value: string | null): value is ThemeId {
    return value != null && value in THEMES;
  }
}
