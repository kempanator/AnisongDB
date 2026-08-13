import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, model, signal } from '@angular/core';
import { ClipboardService } from '../core/services/clipboard.service';
import { RankedStatusService } from '../core/services/ranked-status.service';
import { UserPreferencesService } from '../core/services/user-preferences.service';
import { SongSearchController } from '../search/song-search-controller.service';
import { SongTableController } from './song-table.controller';
import { computeTableStats, formatAvgLength, StatBreakdownEntry } from './song-table-stats';

type StatsTab = 'types' | 'anime' | 'artists' | 'difficulty';

type StatsSectionConfig = {
  title: string;
  entries: StatBreakdownEntry[];
};

@Component({
  selector: 'app-song-table-stats',
  templateUrl: './song-table-stats.component.html',
  styleUrls: ['./song-table-stats.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class SongTableStatsComponent {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly clipboard = inject(ClipboardService);
  private readonly songSearchController = inject(SongSearchController);
  private readonly rankedStatusService = inject(RankedStatusService);
  private readonly table = inject(SongTableController);
  private readonly preferences = inject(UserPreferencesService);
  readonly stats = computed(() => computeTableStats(
    this.table.songs(),
    this.preferences.preferences().animeTitleLanguage,
  ));
  readonly open = model(false);
  readonly activeTab = signal<StatsTab>('types');
  readonly rankedActive = this.rankedStatusService.active;

  readonly formatAvgLength = formatAvgLength;

  readonly breakdownSections = computed((): StatsSectionConfig[] => {
    const stats = this.stats();
    return [
      { title: 'Song types', entries: stats.songTypeBreakdown },
      { title: 'Broadcasts', entries: stats.broadcastBreakdown },
      { title: 'Performance', entries: stats.performanceBreakdown },
      { title: 'Anime types', entries: stats.animeTypeBreakdown },
    ];
  });

  onCopy(event: MouseEvent, text: string): void {
    event.stopPropagation();
    this.clipboard.copy(event, text);
  }

  searchAnime(id: number, event: MouseEvent): void {
    event.stopPropagation();
    if (this.songSearchController.searchAnnIds([id])) {
      this.open.set(false);
    }
  }

  searchArtist(id: number, event: MouseEvent): void {
    event.stopPropagation();
    if (this.rankedActive()) return;

    if (this.songSearchController.searchArtistIds([id])) {
      this.open.set(false);
    }
  }

  toggle(event: Event) {
    event.stopPropagation();
    this.open.set(!this.open());
  }

  onDocumentClick(event: MouseEvent) {
    if (
      this.open() &&
      !this.host.nativeElement.contains(event.target as Node)
    ) {
      this.open.set(false);
    }
  }
}
