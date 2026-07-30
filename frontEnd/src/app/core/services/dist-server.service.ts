import { inject, Injectable, signal } from '@angular/core';
import { UserPreferencesService } from './user-preferences.service';

export type DistServer = 'naedist' | 'nawdist' | 'eudist';

export type DistServerInfo = {
  label: string;
  baseUrl: string;
};

export const DIST_SERVERS: Record<DistServer, DistServerInfo> = {
  naedist: {
    label: 'North America East',
    baseUrl: 'https://naedist.animemusicquiz.com/',
  },
  nawdist: {
    label: 'North America West',
    baseUrl: 'https://nawdist.animemusicquiz.com/',
  },
  eudist: {
    label: 'Europe',
    baseUrl: 'https://eudist.animemusicquiz.com/',
  },
};

const DIST_SERVER_DISPLAY_ORDER: DistServer[] = ['nawdist', 'naedist', 'eudist'];

@Injectable({
  providedIn: 'root',
})
export class DistServerService {
  private readonly preferences = inject(UserPreferencesService);
  private readonly defaultServer: DistServer = 'naedist';
  private readonly distServerSignal = signal<DistServer>(
    this.loadInitialDistServer(),
  );
  readonly distServer = this.distServerSignal.asReadonly();
  readonly availableServers = DIST_SERVER_DISPLAY_ORDER;

  setDistServer(server: DistServer): void {
    if (!this.isDistServer(server)) {
      return;
    }

    this.distServerSignal.set(server);
    this.preferences.updateStoredValues({ distServer: server });
  }

  resetDistServer(): void {
    this.preferences.removeStoredValues('distServer');
    this.distServerSignal.set(this.defaultServer);
  }

  getDistServerInfo(server: DistServer = this.distServer()): DistServerInfo {
    return DIST_SERVERS[server];
  }

  getBaseUrl(server: DistServer = this.distServer()): string {
    return DIST_SERVERS[server].baseUrl;
  }

  getDistUrl(filename: string | null | undefined): string {
    if (!filename) {
      return '';
    }

    return `${this.getBaseUrl()}${filename}`;
  }

  private loadInitialDistServer(): DistServer {
    const saved = this.preferences.getStoredValue('distServer');
    return this.isDistServer(saved) ? saved : this.defaultServer;
  }

  private isDistServer(value: unknown): value is DistServer {
    return typeof value === 'string' && value in DIST_SERVERS;
  }
}
