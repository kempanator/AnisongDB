import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { SearchRequestService } from './search-request.service';

describe('SearchRequestService', () => {
  let service: SearchRequestService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SearchRequestService);
  });
  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
