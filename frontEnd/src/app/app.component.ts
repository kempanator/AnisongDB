import { ChangeDetectionStrategy, Component, DOCUMENT, effect, inject } from '@angular/core';
import { AppHeaderComponent } from './app-header.component';
import { AudioPlayerComponent } from './audio/audio-player.component';
import { ModalService } from './core/services/modal.service';
import { UserPreferencesService } from './core/services/user-preferences.service';
import { PlaylistDialogComponent } from './playlist/playlist-dialog.component';
import { SearchBarComponent } from './search/search-bar.component';
import { SongSearchController } from './search/song-search-controller.service';
import { SettingsDialogComponent } from './settings/settings-dialog.component';
import { ToastOutletComponent } from './shared/toast-outlet.component';
import { ClipboardPopupOutletComponent } from './shared/clipboard-popup-outlet.component';
import { SongTableComponent } from './song-table/song-table.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AppHeaderComponent,
    AudioPlayerComponent,
    ClipboardPopupOutletComponent,
    PlaylistDialogComponent,
    SearchBarComponent,
    SettingsDialogComponent,
    SongTableComponent,
    ToastOutletComponent,
  ],
})
export class AppComponent {
  private readonly document = inject(DOCUMENT);
  private readonly preferences = inject(UserPreferencesService);
  private readonly modals = inject(ModalService);
  private readonly searches = inject(SongSearchController);
  readonly activeModal = this.modals.active;

  constructor() {
    // Load 50 random songs on startup
    this.searches.startInitialSearch();

    effect(() => {
      this.document.documentElement.dataset['theme'] =
        this.preferences.preferences().theme;
    });
  }
}
