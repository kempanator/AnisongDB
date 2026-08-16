import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RANKED_REGIONS, RANKED_SCHEDULE_LABEL, RankedStatusService, type RankedStatus } from '../shared/ranked-status.service';
import { NotificationService } from '../shared/notification.service';
import { UserPreferencesService } from '../settings/user-preferences.service';
import { downloadJsonFile, sanitizeFileNameSegment } from '../shared/json-file';
import { SongWorkspaceStore } from '../songs/song-workspace.store';
import { ADVANCED_LOOKUP_OPTIONS, buildSearchCommand, createDefaultSearchFormState, getAdvancedLookupOption, SEARCH_MATCH_MODE_OPTIONS } from './search-query';
import { SongSearchController } from './song-search-controller.service';

@Component({
  selector: 'app-search-bar',
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchBarComponent {
  private readonly searches = inject(SongSearchController);
  private readonly workspace = inject(SongWorkspaceStore);
  private readonly userPreferencesService = inject(UserPreferencesService);
  private readonly rankedStatusService = inject(RankedStatusService);
  private readonly notifications = inject(NotificationService);

  readonly showAdvancedFilters = computed(
    () => this.userPreferencesService.preferences().searchMode === 'advanced',
  );

  readonly form = createDefaultSearchFormState();
  readonly rankedStatus = this.rankedStatusService.status;
  readonly rankedRegions = RANKED_REGIONS;
  readonly rankedScheduleLabel = RANKED_SCHEDULE_LABEL;
  readonly matchModeOptions = SEARCH_MATCH_MODE_OPTIONS;
  readonly advancedLookupOptions = ADVANCED_LOOKUP_OPTIONS;
  readonly getAdvancedLookupOption = getAdvancedLookupOption;

  toggleAdvancedFilters(): void {
    const showAdvancedFilters = !this.showAdvancedFilters();
    this.form.main = '';
    this.userPreferencesService.updatePreferences({
      searchMode: showAdvancedFilters ? 'advanced' : 'simple',
    });
  }

  formatRankedRemaining(status: RankedStatus): string {
    return this.rankedStatusService.formatRemaining(status);
  }

  submitSearch(): void {
    const result = buildSearchCommand(
      this.form,
      this.showAdvancedFilters(),
      this.rankedStatus().active,
    );
    if ('error' in result) {
      this.notifications.show(result.error);
      return;
    }

    this.searches.runSearch(result.command);
  }

  toggleAdvancedSearchFieldMode(): void {
    this.form.advancedSearchFieldMode =
      this.form.advancedSearchFieldMode === 'text' ? 'lookup' : 'text';
  }

  private currentSearchTerms(): string[] {
    if (!this.showAdvancedFilters()) {
      return [this.form.main];
    }
    if (this.form.advancedSearchFieldMode === 'lookup') {
      return [this.form.advancedLookupType, this.form.advancedLookupValue];
    }
    return [this.form.anime, this.form.songName, this.form.artist, this.form.composer];
  }

  private buildDownloadFileName(): string {
    const segments = this.currentSearchTerms()
      .map(sanitizeFileNameSegment)
      .filter(Boolean);

    return [...segments, 'SongList'].join('_') + '.json';
  }

  downloadJson(): void {
    downloadJsonFile(
      this.buildDownloadFileName(),
      this.workspace.songs() ?? [],
    );
  }
}
