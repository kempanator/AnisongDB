import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, model, output, signal } from '@angular/core';
import { RankedStatusService } from '../core/services/ranked-status.service';
import { UserPreferencesService } from '../core/services/user-preferences.service';
import { SongSearchController } from '../core/services/song-search-controller.service';
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
  private readonly songSearchController = inject(SongSearchController);
  private readonly rankedStatusService = inject(RankedStatusService);
  private readonly table = inject(SongTableController);
  private readonly preferences = inject(UserPreferencesService);
  readonly stats = computed(() => computeTableStats(
    this.table.songs(),
    this.preferences.preferences().animeTitleLanguage,
  ));
  readonly open = model(false);
  readonly copyText = output<{ event: MouseEvent; text: string }>();
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
    this.copyText.emit({ event, text });
  }

  isSearchableId(key: string): boolean {
    const id = Number(key);
    return Number.isSafeInteger(id) && id >= 0;
  }

  searchAnime(key: string, event: MouseEvent): void {
    event.stopPropagation();
    const id = Number(key);
    if (this.isSearchableId(key) && this.songSearchController.searchAnnIds([id])) {
      this.open.set(false);
    }
  }

  searchArtist(key: string, event: MouseEvent): void {
    event.stopPropagation();
    if (this.rankedActive()) return;

    const id = Number(key);
    if (this.isSearchableId(key) && this.songSearchController.searchArtistIds([id])) {
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
