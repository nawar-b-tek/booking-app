import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  personCircleOutline,
  notificationsOutline,
  logOutOutline
} from 'ionicons/icons';

import { AppModule } from './app/app.module';

// Explicitly register the Ionicons used in the toolbar to avoid any icon loader issues
addIcons({
  'calendar-outline': calendarOutline,
  'person-circle-outline': personCircleOutline,
  'notifications-outline': notificationsOutline,
  'log-out-outline': logOutOutline,
});

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.log(err));
