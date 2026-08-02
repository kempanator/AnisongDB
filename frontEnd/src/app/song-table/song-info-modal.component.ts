import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { SongRow } from '../core/models/song';
import { DistServerService } from '../core/services/dist-server.service';
import { RankedStatusService } from '../core/services/ranked-status.service';
import { SongSearchController } from '../core/services/song-search-controller.service';
import { ModalShellComponent } from '../shared/modal-shell.component';
import { buildSongInfoView, collectPersonIds, creditSearchTitle } from './song-table.utils';
import { CreditPerson, CreditSearchRole } from './song-table.types';

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

  readonly song = input.required<SongRow>();
  readonly rowIndex = input(0);
  readonly totalRows = input(0);
  readonly showAmqSongId = input(false);
  readonly clipboardPopup = input<{ left: string; top: string } | null>(null);
  readonly modalContent = viewChild<ElementRef<HTMLElement>>('modalContent');

  readonly closed = output<void>();
  readonly copyText = output<{ event: MouseEvent; text: string }>();
  readonly navigate = output<number>();
  private readonly modal = viewChild.required(ModalShellComponent);

  readonly rankedActive = this.rankedStatusService.active;
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
      this.navigate.emit(event.key === 'ArrowLeft' ? -1 : 1);
    }
  }

  gridColumns(itemCount: number): string {
    return `repeat(${Math.min(this.maxGridColumns, itemCount)}, 1fr)`;
  }

  creditSubgridColumns(sectionPeopleCount: number): string {
    const parentColumns = Math.min(this.maxGridColumns, sectionPeopleCount);
    return `repeat(${this.maxGridColumns - parentColumns + 1}, 1fr)`;
  }

  searchCredit(person: CreditPerson, role: CreditSearchRole, event?: MouseEvent) {
    event?.stopPropagation();
    const personIds = collectPersonIds(person);
    const searchStarted = role === 'artist'
      ? this.songSearchController.searchArtistIds(personIds)
      : this.songSearchController.searchComposerIds(personIds);

    if (searchStarted) {
      this.modal().close();
    }
  }

  searchSeason(season: string, event?: MouseEvent) {
    event?.stopPropagation();
    if (!season) {
      return;
    }

    if (this.songSearchController.searchSeason(season)) {
      this.modal().close();
    }
  }

  searchAnnId(id: string | number, event?: MouseEvent) {
    event?.stopPropagation();
    if (this.songSearchController.searchAnnIds([id])) {
      this.modal().close();
    }
  }

  searchAmqSongId(id: string | number, event?: MouseEvent) {
    event?.stopPropagation();
    if (this.songSearchController.searchAmqSongIds([id])) {
      this.modal().close();
    }
  }
}
