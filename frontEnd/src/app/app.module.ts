import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SearchBarComponent } from './search-bar/search-bar.component';
import { SongTableComponent } from './song-table/song-table.component';

@NgModule({
  declarations: [AppComponent, SearchBarComponent, SongTableComponent],
  imports: [BrowserModule, AppRoutingModule, BrowserAnimationsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [provideHttpClient(withInterceptorsFromDi())],
  bootstrap: [AppComponent],
})
export class AppModule {}
