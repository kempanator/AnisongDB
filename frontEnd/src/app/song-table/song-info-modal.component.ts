import { afterRenderEffect, ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, output, viewChild } from '@angular/core';
import { SongCredit, SongRow } from '../core/models/song';
import { DistServerService } from '../core/services/dist-server.service';
import { ModalService } from '../core/services/modal.service';
import { RankedStatusService } from '../core/services/ranked-status.service';
import { SongSearchController } from '../core/services/song-search-controller.service';
import { UserPreferencesService } from '../core/services/user-preferences.service';
import { ModalShellComponent } from '../shared/modal-shell.component';
import { buildSongInfoView, CreditSearchRole, creditSearchTitle } from './song-info';
import { SongTableController } from './song-table.controller';
import { collectPersonIds } from './song-table.utils';

@Component({
  selector: 'app-song-info-modal',
  templateUrl: './song-info-modal.component.html',
  styleUrls: ['./song-info-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown)': 'onKeydown($event)' },
  imports: [ModalShellComponent],
})
export class SongInfoModalComponent {
  private readonly songSearchController = inject(SongSearchController);
  private readonly rankedStatusService = inject(RankedStatusService);
  private readonly distServerService = inject(DistServerService);
  private readonly modalService = inject(ModalService);
  private readonly preferences = inject(UserPreferencesService);
  private readonly table = inject(SongTableController);

  readonly song = input.required<SongRow>();
  readonly clipboardPopup = input<{ left: string; top: string } | null>(null);
  readonly modalContent = viewChild<ElementRef<HTMLElement>>('modalContent');

  readonly copyText = output<{ event: MouseEvent; text: string }>();

  readonly rankedActive = this.rankedStatusService.active;
  readonly rowIndex = computed(() => this.table.songs()?.indexOf(this.song()) ?? -1);
  readonly totalRows = computed(() => this.table.songs()?.length ?? 0);
  readonly showAmqSongId = computed(() => this.preferences.preferences().showAmqSongId);
  readonly creditSearchTitle = creditSearchTitle;

  readonly info = computed(() => {
    const server = this.distServerService.distServer();
    return buildSongInfoView(this.song(), this.distServerService.getBaseUrl(server));
  });

  // Scroll back to the top after each rendered song change.
  private readonly scrollOnSongChange = afterRenderEffect(() => {
    this.song();
    this.modalContent()?.nativeElement.scrollTo(0, 0);
  });

  private readonly maxGridColumns = 3;

  onCopy(event: MouseEvent, text: unknown) {
    this.copyText.emit({ event, text: String(text ?? '') });
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
    this.modalService.close('song-info');
  }

  navigate(delta: number): void {
    const songs = this.table.songs();
    const index = songs?.indexOf(this.song()) ?? -1;
    if (!songs || songs.length <= 1 || index < 0) return;

    this.modalService.open({
      type: 'song-info',
      song: songs[(index + delta + songs.length) % songs.length],
    });
  }

  searchCredit(person: SongCredit, role: CreditSearchRole, event?: MouseEvent) {
    event?.stopPropagation();
    const personIds = collectPersonIds(person);
    const searchStarted = role === 'artist'
      ? this.songSearchController.searchArtistIds(personIds)
      : this.songSearchController.searchComposerIds(personIds);

    if (searchStarted) {
      this.close();
    }
  }

  searchSeason(season: string, event?: MouseEvent) {
    event?.stopPropagation();
    if (!season) {
      return;
    }

    if (this.songSearchController.searchSeason(season)) {
      this.close();
    }
  }

  searchAnnId(id: string | number, event?: MouseEvent) {
    event?.stopPropagation();
    if (this.songSearchController.searchAnnIds([id])) {
      this.close();
    }
  }

  searchAmqSongId(id: string | number, event?: MouseEvent) {
    event?.stopPropagation();
    if (this.songSearchController.searchAmqSongIds([id])) {
      this.close();
    }
  }
}
