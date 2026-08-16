import { ChangeDetectionStrategy, Component, DOCUMENT, effect, inject } from '@angular/core';
import { AppHeaderComponent } from './app-header.component';
import { AudioPlayerComponent } from './audio/audio-player.component';
import { UserPreferencesService } from './settings/user-preferences.service';
import { AppModalOutletComponent } from './modals/app-modal-outlet.component';
import { SearchBarComponent } from './search/search-bar.component';
import { SongSearchController } from './search/song-search-controller.service';
import { ToastOutletComponent } from './shared/toast-outlet.component';
import { SongTableComponent } from './song-table/song-table.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AppHeaderComponent,
    AppModalOutletComponent,
    AudioPlayerComponent,
    SearchBarComponent,
    SongTableComponent,
    ToastOutletComponent,
  ],
})
export class AppComponent {
  private readonly document = inject(DOCUMENT);
  private readonly preferences = inject(UserPreferencesService);
  private readonly searches = inject(SongSearchController);

  constructor() {
    // Load 50 random songs on startup
    this.searches.startInitialSearch();

    effect(() => {
      this.document.documentElement.dataset['theme'] =
        this.preferences.preferences().theme;
    });
  }
}
