import { Injectable } from '@angular/core';

export type StoredAppData = Record<string, unknown>;

const STORAGE_KEY = 'anisongdb-app-data';

@Injectable({ providedIn: 'root' })
export class AppStorageService {
  readAll(): StoredAppData {
    try {
      const rawValue = localStorage.getItem(STORAGE_KEY);
      if (!rawValue) return {};

      const value: unknown = JSON.parse(rawValue);
      return value && typeof value === 'object' && !Array.isArray(value)
        ? value as StoredAppData
        : {};
    } catch {
      return {};
    }
  }

  get(key: string): unknown {
    return this.readAll()[key];
  }

  update(values: StoredAppData): boolean {
    return this.write({
      ...this.readAll(),
      ...values,
    });
  }

  remove(...keys: string[]): boolean {
    const values = this.readAll();
    for (const key of keys) delete values[key];

    return Object.keys(values).length
      ? this.write(values)
      : this.clear();
  }

  replaceAll(values: StoredAppData): boolean {
    return this.write(values);
  }

  clear(): boolean {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch {
      return false;
    }
  }

  private write(values: StoredAppData): boolean {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
      return true;
    } catch {
      return false;
    }
  }
}
