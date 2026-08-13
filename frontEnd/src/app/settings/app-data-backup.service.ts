import { inject, Injectable } from '@angular/core';
import { AppStorageService, type StoredAppData } from '../core/services/app-storage.service';
import { downloadJsonFile, readJsonFile } from '../shared/json-file';

interface AppDataBackup {
  format: 'anisongdb-app-data';
  exportedAt: string;
  data: StoredAppData;
}

@Injectable({ providedIn: 'root' })
export class AppDataBackupService {
  private readonly storage = inject(AppStorageService);

  exportAll(): void {
    const backup: AppDataBackup = {
      format: 'anisongdb-app-data',
      exportedAt: new Date().toISOString(),
      data: this.storage.readAll(),
    };
    downloadJsonFile(
      `anisongdb-data-${backup.exportedAt.slice(0, 10)}.json`,
      backup,
      2,
    );
  }

  async readFile(file: File): Promise<StoredAppData | null> {
    const parsed = await readJsonFile(file);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

    const candidate = parsed as Partial<AppDataBackup>;
    if (
      candidate.format !== 'anisongdb-app-data'
      || !candidate.data
      || typeof candidate.data !== 'object'
      || Array.isArray(candidate.data)
    ) return null;

    return candidate.data;
  }
}
