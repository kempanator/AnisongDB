import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SongRow } from '../core/models/song';
import { SearchCommand } from './search';

const SEARCH_ENDPOINTS: Record<SearchCommand['kind'], string> = {
  'initial-random': '/api/get_50_random_songs',
  'random': '/api/get_n_random_songs',
  'general': '/api/search_request',
  'season': '/api/season_request',
  'ann-ids': '/api/ann_ids_request',
  'mal-ids': '/api/mal_ids_request',
  'ann-song-ids': '/api/ann_song_ids_request',
  'amq-song-ids': '/api/amq_song_ids_request',
  'artist-ids': '/api/artist_ids_request',
  'composer-ids': '/api/composer_ids_request',
};

@Injectable({
  providedIn: 'root',
})
export class SearchRequestService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  request(command: SearchCommand): Observable<SongRow[]> {
    const body = 'body' in command ? command.body : {};
    return this.http.post<SongRow[]>(
      this.apiUrl + SEARCH_ENDPOINTS[command.kind],
      body,
      { headers: { 'X-Client-Id': 'AnisongDB' } },
    );
  }
}
