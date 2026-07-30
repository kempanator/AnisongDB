import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SongRow } from '../models/song';
import { SongSearchBody } from '../models/search';

@Injectable({
  providedIn: 'root',
})
export class SearchRequestService {
  static readonly INITIAL_RANDOM_BODY = { type: 'initial_random_songs' } as const;

  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private apiPost<TResponse>(path: string, body: object): Observable<TResponse> {
    return this.http.post<TResponse>(this.apiUrl + path, body, {
      headers: { 'X-Client-Id': 'AnisongDB' },
    });
  }

  getFirstNRequest(): Observable<SongRow[]> {
    return this.apiPost<SongRow[]>('/api/get_50_random_songs', {});
  }

  randomSongsRequest(body: SongSearchBody): Observable<SongRow[]> {
    return this.apiPost<SongRow[]>('/api/get_n_random_songs', body);
  }

  searchRequest(body: SongSearchBody): Observable<SongRow[]> {
    return this.apiPost<SongRow[]>('/api/search_request', body);
  }

  seasonRequest(body: SongSearchBody): Observable<SongRow[]> {
    return this.apiPost<SongRow[]>('/api/season_request', body);
  }

  artistIdsSearchRequest(body: SongSearchBody): Observable<SongRow[]> {
    return this.apiPost<SongRow[]>('/api/artist_ids_request', body);
  }

  composerIdsSearchRequest(body: SongSearchBody): Observable<SongRow[]> {
    return this.apiPost<SongRow[]>('/api/composer_ids_request', body);
  }

  annIdsSearchRequest(body: SongSearchBody): Observable<SongRow[]> {
    return this.apiPost<SongRow[]>('/api/ann_ids_request', body);
  }

  malIdsSearchRequest(body: SongSearchBody): Observable<SongRow[]> {
    return this.apiPost<SongRow[]>('/api/mal_ids_request', body);
  }

  annSongIdsSearchRequest(body: SongSearchBody): Observable<SongRow[]> {
    return this.apiPost<SongRow[]>('/api/ann_song_ids_request', body);
  }

  amqSongIdsSearchRequest(body: SongSearchBody): Observable<SongRow[]> {
    return this.apiPost<SongRow[]>('/api/amq_song_ids_request', body);
  }
}
