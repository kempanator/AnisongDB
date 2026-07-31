import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
} from '@angular/core';
import { RankedStatus, RankedStatusService } from '../core/services/ranked-status.service';
import { NotificationService } from '../core/services/notification.service';
import { SongSearchController } from '../core/services/song-search-controller.service';
import { UserPreferencesService } from '../core/services/user-preferences.service';
import { SongRow } from '../core/models/song';
import { downloadJsonFile } from '../shared/download-json-file';
import {
  AdvancedLookupType,
  AdvancedSearchFieldMode,
  buildSearchCommand,
  SearchCombination,
  SearchFormState,
  SearchMatchMode,
  searchValidationError,
} from './search-query';

@Component({
  selector: 'app-search-bar',
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchBarComponent implements OnInit {
  readonly songSearchController = inject(SongSearchController);
  private readonly userPreferencesService = inject(UserPreferencesService);
  private readonly rankedStatusService = inject(RankedStatusService);
  private readonly notifications = inject(NotificationService);

  readonly currentSongList = input<SongRow[] | null>();
  readonly showAdvancedFilters = computed(
    () => this.userPreferencesService.preferences().searchMode === 'advanced',
  );

  mainFilter = '';
  animeFilter = '';
  songNameFilter = '';
  artistFilter = '';
  composerFilter = '';
  advancedSearchFieldMode: AdvancedSearchFieldMode = 'text';
  advancedLookupType: AdvancedLookupType = 'season';
  advancedLookupValue = '';
  seasonRangeStart = '';
  seasonRangeEnd = '';
  maximumOtherPeople = '99';
  minimumGroupMembers = '0';
  searchCombination: SearchCombination = 'or';
  mainFilterPartialMatch = true;
  animeMatchMode: SearchMatchMode = 'partial';
  songNameMatchMode: SearchMatchMode = 'partial';
  artistMatchMode: SearchMatchMode = 'partial';
  composerMatchMode: SearchMatchMode = 'partial';
  composerFilterArrangement = true;
  includeNoLinks = true;
  ignoreDuplicate = false;
  showOpenings = true;
  showEndings = true;
  showInserts = true;
  showNormalBroadcasts = true;
  showDubs = true;
  showRebroadcasts = true;
  showStandards = true;
  showCharacters = true;
  showChantings = true;
  showInstrumentals = true;
  showTv = true;
  showMovie = true;
  showOva = true;
  showOna = true;
  showSpecial = true;
  showOther = true;
  readonly rankedStatus = this.rankedStatusService.status;

  ngOnInit(): void {
    this.songSearchController.startInitialSearch();
  }

  toggleAdvancedFilters(): void {
    const showAdvancedFilters = !this.showAdvancedFilters();
    this.mainFilter = '';
    this.userPreferencesService.updatePreferences({
      searchMode: showAdvancedFilters ? 'advanced' : 'simple',
    });
  }

  formatRankedRemaining(status: RankedStatus): string {
    return this.rankedStatusService.formatRemaining(status);
  }

  submitSearch(): void {
    const state = this.searchFormState();
    const validationError = searchValidationError(state);
    if (validationError) {
      this.notifications.show(validationError);
      return;
    }

    const command = buildSearchCommand(state, this.rankedStatus().active);
    if (!command) {
      this.notifications.show('Enter at least one search term.');
      return;
    }
    this.songSearchController.runSearch(command);
  }

  private searchFormState(): SearchFormState {
    const songTypes = {
      openings: this.showOpenings,
      endings: this.showEndings,
      inserts: this.showInserts,
    };

    if (!this.showAdvancedFilters()) {
      return {
        advanced: false,
        main: this.mainFilter,
        mainPartialMatch: this.mainFilterPartialMatch,
        ignoreDuplicate: this.ignoreDuplicate,
        filters: songTypes,
      };
    }

    return {
      advanced: true,
      anime: this.animeFilter,
      songName: this.songNameFilter,
      artist: this.artistFilter,
      composer: this.composerFilter,
      advancedSearchFieldMode: this.advancedSearchFieldMode,
      advancedLookupType: this.advancedLookupType,
      advancedLookupValue: this.advancedLookupValue,
      seasonRangeStart: this.seasonRangeStart,
      seasonRangeEnd: this.seasonRangeEnd,
      maximumOtherPeople: this.maximumOtherPeople,
      minimumGroupMembers: this.minimumGroupMembers,
      combination: this.searchCombination,
      animeMatchMode: this.animeMatchMode,
      songNameMatchMode: this.songNameMatchMode,
      artistMatchMode: this.artistMatchMode,
      composerMatchMode: this.composerMatchMode,
      composerArrangement: this.composerFilterArrangement,
      ignoreDuplicate: this.ignoreDuplicate,
      filters: {
        ...songTypes,
        normalBroadcasts: this.showNormalBroadcasts,
        dubs: this.showDubs,
        rebroadcasts: this.showRebroadcasts,
        standards: this.showStandards,
        characters: this.showCharacters,
        chantings: this.showChantings,
        instrumentals: this.showInstrumentals,
        tv: this.showTv,
        movie: this.showMovie,
        ova: this.showOva,
        ona: this.showOna,
        special: this.showSpecial,
        other: this.showOther,
        includeNoLinks: this.includeNoLinks,
      },
    };
  }

  toggleAdvancedSearchFieldMode(): void {
    this.advancedSearchFieldMode =
      this.advancedSearchFieldMode === 'text' ? 'lookup' : 'text';
  }

  advancedLookupPlaceholder(): string {
    switch (this.advancedLookupType) {
      case 'season':
        return 'Winter 2020';
      case 'random':
        return '#';
      default:
        return '1, 2, 3';
    }
  }

  openJsonHelp() {
    window.open(
      'https://github.com/xSardine/AMQ-Artists-DB/tree/main/misc_scripts#misc-scripts',
      '_blank',
      'noopener',
    );
  }

  openFiltersHelp() {
    window.open(
      'https://github.com/xSardine/AMQ-Artists-DB#filters',
      '_blank',
      'noopener',
    );
  }

  private currentSearchTerms(): string[] {
    if (!this.showAdvancedFilters()) {
      return [this.mainFilter];
    }
    if (this.advancedSearchFieldMode === 'lookup') {
      return [this.advancedLookupType, this.advancedLookupValue];
    }
    return [this.animeFilter, this.songNameFilter, this.artistFilter, this.composerFilter];
  }

  private buildDownloadFileName(): string {
    const segments = this.currentSearchTerms()
      .map((filter) => filter
        .trim()
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[.-]+|[.-]+$/g, ''))
      .filter(Boolean);

    return [...segments, 'SongList'].join('_') + '.json';
  }

  downloadJson(): void {
    downloadJsonFile(
      this.buildDownloadFileName(),
      this.currentSongList() ?? [],
    );
  }
}
