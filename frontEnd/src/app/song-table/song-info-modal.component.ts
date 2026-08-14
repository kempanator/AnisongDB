import { afterRenderEffect, ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, viewChild } from '@angular/core';
import { hasAnnSongId, SongCredit, Song } from '../songs/song';
import { formatSongLength, getBroadcastMetadata } from '../songs/song-metadata';
import { ClipboardService } from '../shared/clipboard.service';
import { AppModalService } from '../modals/app-modal.service';
import { RankedStatusService } from '../shared/ranked-status.service';
import { UserPreferencesService } from '../settings/user-preferences.service';
import { SongSearchController } from '../search/song-search-controller.service';
import { ModalShellComponent } from '../shared/modal-shell.component';
import { SongWorkspaceStore } from '../songs/song-workspace.store';
import { buildCreditSections, collectPersonIds, CreditSearchRole, creditSearchTitle } from './song-credits';
import { ANIME_LIST_SITES, SONG_DIST_LINKS } from './song-links';

@Component({
  selector: 'app-song-info-modal',
  templateUrl: './song-info-modal.component.html',
  styleUrls: ['./song-info-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown)': 'onKeydown($event)' },
  imports: [ModalShellComponent],
})
export class SongInfoModalComponent {
  private readonly searches = inject(SongSearchController);
  readonly clipboard = inject(ClipboardService);
  private readonly rankedStatusService = inject(RankedStatusService);
  private readonly modals = inject(AppModalService);
  readonly preferences = inject(UserPreferencesService);
  private readonly workspace = inject(SongWorkspaceStore);

  readonly song = input.required<Song>();
  readonly modalContent = viewChild<ElementRef<HTMLElement>>('modalContent');

  readonly rankedActive = this.rankedStatusService.active;
  readonly rowIndex = computed(() => this.workspace.songs()?.indexOf(this.song()) ?? -1);
  readonly totalRows = computed(() => this.workspace.songs()?.length ?? 0);
  readonly showAmqSongId = computed(() => this.preferences.preferences().showAmqSongId);
  readonly creditSearchTitle = creditSearchTitle;

  readonly creditSections = computed(() => buildCreditSections(this.song()));
  readonly broadcast = computed(() => getBroadcastMetadata(this.song()).label);
  readonly formattedLength = computed(() => formatSongLength(this.song().songLength));
  readonly annSongId = computed(() => {
    const song = this.song();
    return hasAnnSongId(song) ? song.annSongId : null;
  });
  readonly animeListSites = ANIME_LIST_SITES;
  readonly songDistLinks = SONG_DIST_LINKS;

  private readonly maxGridColumns = 3;

  constructor() {
    // Scroll back to the top after each rendered song change.
    afterRenderEffect(() => {
      this.song();
      this.modalContent()?.nativeElement.scrollTo(0, 0);
    });
  }

  onCopy(event: MouseEvent, text: unknown) {
    this.clipboard.copy(event, text);
  }

  onKeydown(event: KeyboardEvent) {
    const tag = (event.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      event.stopPropagation();
      this.navigate(event.key === 'ArrowLeft' ? -1 : 1);
    }
  }

  gridColumns(itemCount: number): string {
    return `repeat(${Math.min(this.maxGridColumns, itemCount)}, 1fr)`;
  }

  creditSubgridColumns(sectionPeopleCount: number): string {
    const parentColumns = Math.min(this.maxGridColumns, sectionPeopleCount);
    return `repeat(${this.maxGridColumns - parentColumns + 1}, 1fr)`;
  }

  close(): void {
    this.modals.close('song-info');
  }

  navigate(delta: number): void {
    const songs = this.workspace.songs();
    const index = songs?.indexOf(this.song()) ?? -1;
    if (!songs || songs.length <= 1 || index < 0) return;

    this.modals.open({
      type: 'song-info',
      song: songs[(index + delta + songs.length) % songs.length],
    });
  }

  searchCredit(person: SongCredit, role: CreditSearchRole, event?: MouseEvent) {
    event?.stopPropagation();
    const personIds = collectPersonIds(person);
    const searchStarted = role === 'artist'
      ? this.searches.searchArtistIds(personIds)
      : this.searches.searchComposerIds(personIds);

    if (searchStarted) {
      this.close();
    }
  }

  searchSeason(season: string, event?: MouseEvent) {
    event?.stopPropagation();
    if (!season) {
      return;
    }

    if (this.searches.searchSeason(season)) {
      this.close();
    }
  }

  searchAnnId(id: string | number, event?: MouseEvent) {
    event?.stopPropagation();
    if (this.searches.searchAnnIds([id])) {
      this.close();
    }
  }

  searchAmqSongId(id: string | number, event?: MouseEvent) {
    event?.stopPropagation();
    if (this.searches.searchAmqSongIds([id])) {
      this.close();
    }
  }
}
