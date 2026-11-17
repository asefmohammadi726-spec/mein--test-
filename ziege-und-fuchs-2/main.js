// Einstieg: ?test=model zeigt das Model Sheet, sonst der Film
import { makeComp } from './engine/gl.js';
import { BOIL } from './engine/crayon.js';
import * as M from './film.js';
const Q = new URLSearchParams(location.search);
const comp = makeComp(document.getElementById('gl'));
window.DUR = M.DUR; window.EV = M.EV;
window.render = Q.get('test') === 'model'
  ? t => { BOIL.step = Math.floor(t * 12); M.modelSheet(comp, t); }
  : t => { BOIL.step = Math.floor(t * 12 + 1e-6); M.frame(comp, t); };
window.READY = true;
