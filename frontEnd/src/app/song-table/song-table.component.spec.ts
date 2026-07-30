import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { SongTableComponent } from './song-table.component';

describe('SongTableComponent', () => {
  let component: SongTableComponent;
  let fixture: ComponentFixture<SongTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SongTableComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SongTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
