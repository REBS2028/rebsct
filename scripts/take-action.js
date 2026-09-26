import { calendarConfig } from './calendar-config.js';
import { mountCalendar } from './calendar.js';
import { watchActionExpiry } from './action-expiry.js';
import { mountNavigation } from './navigation.js';

watchActionExpiry();
mountCalendar({ config: calendarConfig });

mountNavigation();
