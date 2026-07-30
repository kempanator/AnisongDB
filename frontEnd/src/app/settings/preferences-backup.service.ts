import { inject, Injectable } from '@angular/core';
import {
  StoredUserPreferences,
  UserPreferencesService,
} from '../core/services/user-preferences.service';
import { downloadJsonFile } from '../shared/download-json-file';

interface PreferencesBackup {
  format: 'anisongdb-preferences';
  exportedAt: string;
  userPreferences: StoredUserPreferences;
}

@Injectable({ providedIn: 'root' })
export class PreferencesBackupService {
  private readonly preferences = inject(UserPreferencesService);

  exportAll(): void {
    const backup: PreferencesBackup = {
      format: 'anisongdb-preferences',
      exportedAt: new Date().toISOString(),
      userPreferences: this.preferences.readStoredPreferences(),
    };
    downloadJsonFile(
      `anisongdb-preferences-${backup.exportedAt.slice(0, 10)}.json`,
      backup,
      2,
    );
  }

  async readFile(file: File): Promise<StoredUserPreferences | null> {
    const parsed: unknown = JSON.parse(await file.text());
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const candidate = parsed as Partial<PreferencesBackup>;
    if (
      candidate.format !== 'anisongdb-preferences'
      || !candidate.userPreferences
      || typeof candidate.userPreferences !== 'object'
      || Array.isArray(candidate.userPreferences)
    ) return null;
    return candidate.userPreferences;
  }

  replaceAll(values: StoredUserPreferences): boolean {
    const previous = this.preferences.readStoredPreferences();
    try {
      this.preferences.replaceStoredPreferences(values);
      return true;
    } catch {
      try {
        this.preferences.replaceStoredPreferences(previous);
      } catch {
        // Best-effort rollback when storage itself is unavailable.
      }
      return false;
    }
  }
}
