import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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

const DIST_SERVER_IDS = Object.keys(DIST_SERVERS) as DistServer[];

@Injectable({
  providedIn: 'root',
})
export class DistServerService {
  private readonly storageKey = 'distServer';
  private readonly defaultServer: DistServer = 'naedist';

  private readonly distServerSubject: BehaviorSubject<DistServer>;
  readonly distServer$: Observable<DistServer>;

  constructor() {
    const saved = localStorage.getItem(this.storageKey);
    const initial = this.isDistServer(saved) ? saved : this.defaultServer;
    this.distServerSubject = new BehaviorSubject(initial);
    this.distServer$ = this.distServerSubject.asObservable();
  }

  getDistServer(): DistServer {
    return this.distServerSubject.value;
  }

  setDistServer(server: DistServer): void {
    if (!this.isDistServer(server)) {
      return;
    }

    localStorage.setItem(this.storageKey, server);
    this.distServerSubject.next(server);
  }

  getDistServerInfo(server: DistServer = this.getDistServer()): DistServerInfo {
    return DIST_SERVERS[server];
  }

  getBaseUrl(server: DistServer = this.getDistServer()): string {
    return DIST_SERVERS[server].baseUrl;
  }

  getDistUrl(filename: string | null | undefined): string {
    if (!filename) {
      return '';
    }

    return `${this.getBaseUrl()}${filename}`;
  }

  readonly availableServers = DIST_SERVER_IDS;

  private isDistServer(value: string | null): value is DistServer {
    return value != null && value in DIST_SERVERS;
  }
}
