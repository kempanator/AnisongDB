import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { AnisongDBApiService } from './app/api/anisong-db-api.service';

import 'vidstack/player';
import 'vidstack/player/layouts/default';
import 'vidstack/player/ui';

bootstrapApplication(AppComponent, {
  providers: [provideHttpClient()],
})
  .then(({ injector }) => {
    window.AnisongDB = injector.get(AnisongDBApiService).api;
  })
  .catch(console.error);
