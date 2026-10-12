// Données, réglages par défaut et petites fonctions de dates

export const CATS = {
  creatif: { label: 'Créatif', c: '--c-creatif', t: '--t-creatif' },
  maison:  { label: 'Aide maison', c: '--c-maison', t: '--t-maison' },
  libre:   { label: 'Temps libre', c: '--c-libre', t: '--t-libre' },
  travail: { label: 'Recherche idée / travail', c: '--c-travail', t: '--t-travail' },
  sport:   { label: 'Sport', c: '--c-sport', t: '--t-sport' },
  cuisine: { label: 'Cuisine', c: '--c-cuisine', t: '--t-cuisine' }
}

export const DEFAULTS = {
  jour: { debut: 6, fin: 23 },
  theme: 'auto',
  ia: { key: '', model: 'gemini-2.5-flash' },
  notif: {
    enabled: true,
    avant: { on: true, minutes: 5 },            // rappel avant chaque tranche planifiée
    fin: { on: false, minutes: 5 },             // fin de tranche + « ensuite »
    horaire: { on: false, debut: 9, fin: 21, seulementLibres: false }, // point chaque heure
    categories: { creatif: true, maison: true, libre: true, travail: true, sport: true, cuisine: true },
    matin: { on: true, heure: '08:00' },        // programme du jour
    soir: { on: false, heure: '21:00' },        // planifier demain
    calme: { on: true, debut: 22, fin: 7 },     // heures calmes
    horizon: 7                                  // jours programmés à l'avance
  }
}

const KEY_DATA = 'mh-data-v1'
const KEY_SET = 'mh-settings-v1'

function read(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v) } catch (e) { return d } }
function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) {} }

function merge(base, over) {
  if (typeof base !== 'object' || base === null || Array.isArray(base)) return over === undefined ? base : over
  const out = { ...base }
  if (over && typeof over === 'object') for (const k of Object.keys(over)) out[k] = k in base ? merge(base[k], over[k]) : over[k]
  return out
}

export const state = {
  data: read(KEY_DATA, null),
  settings: merge(DEFAULTS, read(KEY_SET, {}))
}
if (!state.data) { state.data = seed(); write(KEY_DATA, state.data) }

export function saveData() { write(KEY_DATA, state.data) }
export function saveSettings() { write(KEY_SET, state.settings) }

export function getPath(obj, path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj) }
export function setPath(obj, path, val) {
  const ks = path.split('.'); let o = obj
  ks.slice(0, -1).forEach(k => { o[k] = o[k] ?? {}; o = o[k] })
  o[ks.at(-1)] = val
}

export function exportJSON() { return JSON.stringify({ app: 'mes-heures', version: 1, data: state.data, settings: { ...state.settings, ia: { ...state.settings.ia, key: '' } } }, null, 1) }
export function importJSON(txt) {
  const j = JSON.parse(txt)
  if (!j || typeof j.data !== 'object') throw new Error('Ce texte ne vient pas d’une sauvegarde Mes Heures.')
  state.data = j.data
  if (j.settings) { const key = state.settings.ia.key; state.settings = merge(DEFAULTS, j.settings); if (!state.settings.ia.key) state.settings.ia.key = key }
  saveData(); saveSettings()
}
export function resetAll() { state.data = {}; saveData() }

// Dates
export function pad(n) { return String(n).padStart(2, '0') }
export function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) }
export function fromIso(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
export function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }
export function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x }
export function monday(d) { const x = startOfDay(d); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return x }
export function dayData(k) { return state.data[k] || {} }

function seed() { // exemples pour aujourd'hui, modifiables
  return { [iso(new Date())]: {
    9: { cat: 'travail', note: 'Chercher des idées de projet impression 3D' },
    10: { cat: 'creatif', note: 'Modéliser une rose (exemple)' },
    12: { cat: 'cuisine', note: 'Préparer le déjeuner' },
    14: { cat: 'maison', note: 'Ménage / rangement' },
    17: { cat: 'sport', note: 'Marche rapide' },
    18: { cat: 'libre', note: 'Balade' }
  } }
}
