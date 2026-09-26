import { watchActionExpiry } from './action-expiry.js';
import { updateElection } from './election-model.js';
import { mountMemorial } from './memorial.js';
import { mountNavigation } from './navigation.js';

watchActionExpiry();
mountNavigation();
mountMemorial();
const update = () => updateElection();
update();
window.setInterval(update, 30_000);
window.addEventListener('pageshow', update);
window.addEventListener('focus', update);
document.addEventListener('visibilitychange', update);
