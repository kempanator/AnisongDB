import { inject, Injectable, signal } from '@angular/core';
import { DEFAULT_USER_PREFERENCES, getDistServerOption, normalizeUserPreferences, USER_PREFERENCE_KEYS, type UserPreferences } from './user-preferences';
import { AppStorageService } from '../core/app-storage.service';

@Injectable({
  providedIn: 'root',
})
export class UserPreferencesService {
  private readonly storage = inject(AppStorageService);
  private readonly preferencesSignal = signal<UserPreferences>(
    this.loadPreferences(),
  );
  readonly preferences = this.preferencesSignal.asReadonly();

  updatePreferences(preferences: Partial<UserPreferences>): void {
    const next = normalizeUserPreferences({
      ...this.preferencesSignal(),
      ...preferences,
    });

    this.preferencesSignal.set(next);
    this.storage.update(next);
  }

  resetPreferences(): void {
    this.preferencesSignal.set({ ...DEFAULT_USER_PREFERENCES });
    this.storage.remove(...USER_PREFERENCE_KEYS);
  }

  getDistUrl(filename: string | null | undefined): string {
    if (!filename) return '';

    const server = getDistServerOption(this.preferencesSignal().distServer);
    return `${server.baseUrl}${filename}`;
  }

  private loadPreferences(): UserPreferences {
    return normalizeUserPreferences(this.storage.readAll());
  }
}
