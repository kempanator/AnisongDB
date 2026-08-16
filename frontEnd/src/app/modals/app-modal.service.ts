import { Injectable, signal, untracked } from '@angular/core';
import { Song } from '../songs/song';

type AppModal =
  | { type: 'settings' }
  | { type: 'playlists' }
  | { type: 'song-info'; song: Song }
  | { type: 'playlist-picker'; song: Song };

type AppModalType = AppModal['type'];

@Injectable({ providedIn: 'root' })
export class AppModalService {
  private readonly activeModal = signal<AppModal | null>(null);
  readonly active = this.activeModal.asReadonly();

  open(modal: AppModal): void {
    this.activeModal.set(modal);
  }

  close(type?: AppModalType): void {
    // Closing is a command, so callers should not become reactive consumers of
    // the active modal just because they conditionally close one from an effect.
    untracked(() => {
      if (type && this.active()?.type !== type) return;
      this.activeModal.set(null);
    });
  }
}
