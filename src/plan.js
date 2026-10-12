// Calcul pur de la liste des notifications à venir (testable sans Android)
import { CATS, iso, pad, addDays, startOfDay } from './state.js'

const MAX = 400 // Android limite le nombre d'alarmes par appli

function inQuiet(date, calme) {
  if (!calme.on) return false
  const h = date.getHours(), { debut, fin } = calme
  if (debut === fin) return false
  return debut < fin ? (h >= debut && h < fin) : (h >= debut || h < fin)
}

function at(day, h, m = 0) { const d = new Date(day); d.setHours(h, m, 0, 0); return d }
function atTime(day, hhmm) { const [h, m] = String(hhmm || '08:00').split(':').map(Number); return at(day, h || 0, m || 0) }

function summary(dd) {
  const hours = Object.keys(dd).map(Number).sort((a, b) => a - b)
  if (!hours.length) return null
  const tot = {}
  hours.forEach(h => { tot[dd[h].cat] = (tot[dd[h].cat] || 0) + 1 })
  const parts = Object.keys(CATS).filter(c => tot[c]).map(c => `${CATS[c].label} ${tot[c]} h`)
  const first = hours[0], s = dd[first]
  return { n: hours.length, parts: parts.join(', '), first: `${first}h ${CATS[s.cat].label}${s.note ? ' (' + s.note + ')' : ''}` }
}

export function buildPlan(data, settings, now = new Date()) {
  const n = settings.notif, out = []
  if (!n.enabled) return out
  const push = (o) => out.push(o)

  for (let i = 0; i <= n.horizon; i++) {
    const day = addDays(startOfDay(now), i), k = iso(day), dd = data[k] || {}
    const hours = Object.keys(dd).map(Number).sort((a, b) => a - b)

    for (const h of hours) {
      const s = dd[h]
      if (!CATS[s.cat]) continue
      const mode = s.rappel ?? 'defaut'
      const perso = mode !== 'defaut' && mode !== 'off'
      if (mode === 'off' || (!perso && !n.categories[s.cat])) continue
      const label = CATS[s.cat].label

      // Rappel avant la tranche (réglage global ou rappel propre à la tranche)
      const mins = perso ? Number(mode) : (n.avant.on ? Number(n.avant.minutes) : null)
      if (mins !== null && !Number.isNaN(mins)) {
        push({
          at: at(day, h, -mins), channel: 'planning', perso, kind: 'avant',
          title: `${pad(h)}:00 · ${label}`,
          body: (s.note || 'C’est l’heure de cette tranche.') + (mins ? ` (dans ${mins} min)` : ''),
          extra: { day: k, hour: h }
        })
      }

      // Fin de tranche : seulement si l'heure suivante change d'activité
      if (n.fin.on && !perso) {
        const next = dd[h + 1]
        if (!next || next.cat !== s.cat) {
          push({
            at: at(day, h + 1, -Number(n.fin.minutes)), channel: 'planning', kind: 'fin',
            title: Number(n.fin.minutes) ? `« ${label} » se termine dans ${n.fin.minutes} min` : `Fin de « ${label} »`,
            body: next ? `Ensuite : ${CATS[next.cat].label}${next.note ? ' — ' + next.note : ''}` : 'Rien de prévu ensuite.',
            extra: { day: k, hour: h + 1 }
          })
        }
      }
    }

    // Point horaire
    if (n.horaire.on) {
      for (let h = n.horaire.debut; h <= n.horaire.fin; h++) {
        const s = dd[h]
        if (n.horaire.seulementLibres && s) continue
        if (s && n.avant.on && Number(n.avant.minutes) === 0 && n.categories[s.cat]) continue // évite le doublon
        push({
          at: at(day, h), channel: 'horaire', kind: 'horaire',
          title: `Il est ${h}h`,
          body: s ? `Prévu : ${CATS[s.cat].label}${s.note ? ' — ' + s.note : ''}` : 'Rien de prévu. Que veux-tu faire de cette heure ?',
          extra: { day: k, hour: h }
        })
      }
    }

    // Programme du matin
    if (n.matin.on) {
      const sm = summary(dd)
      push({
        at: atTime(day, n.matin.heure), channel: 'resume', kind: 'matin', explicit: true,
        title: 'Ton programme du jour',
        body: sm ? `${sm.n} tranche${sm.n > 1 ? 's' : ''} : ${sm.parts}. Première : ${sm.first}.` : 'Rien de prévu aujourd’hui. Ouvre l’appli pour planifier.',
        extra: { day: k }
      })
    }

    // Préparer demain
    if (n.soir.on) {
      const kd = iso(addDays(day, 1)), sm = summary(data[kd] || {})
      push({
        at: atTime(day, n.soir.heure), channel: 'resume', kind: 'soir', explicit: true,
        title: 'Et demain ?',
        body: sm ? `Demain : ${sm.parts}. Première : ${sm.first}.` : 'Rien de prévu demain. Prends deux minutes pour planifier.',
        extra: { day: kd }
      })
    }
  }

  const limit = now.getTime() + 5000
  return out
    .filter(o => o.at.getTime() > limit)
    .filter(o => o.perso || o.explicit || !inQuiet(o.at, n.calme))
    .sort((a, b) => a.at - b.at)
    .slice(0, MAX)
    .map((o, i) => ({ ...o, id: i + 1 }))
}
