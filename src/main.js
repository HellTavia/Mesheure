import './style.css'
import { App } from '@capacitor/app'
import { CATS, state, saveData, saveSettings, getPath, setPath, exportJSON, importJSON, resetAll,
  iso, fromIso, addDays, monday, pad, dayData } from './state.js'
import { isNative, initNotifs, permission, exactStatus, openExactSettings, reschedule, testNotif } from './notifs.js'
import { askGemini, md, esc } from './gemini.js'

const $ = id => document.getElementById(id)
const v = name => `var(${name})`
const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const RAPPELS = [['defaut', 'Selon les réglages'], ['off', 'Aucun rappel'], ['0', 'À l’heure pile'], ['5', '5 min avant'],
  ['10', '10 min avant'], ['15', '15 min avant'], ['30', '30 min avant'], ['60', '1 h avant']]

let selDay = iso(new Date())
let weekStart = monday(new Date())
let openHour = null
let pendingCat = null
let tab = 'planning'

// ---------- Planning ----------
function hoursRange() {
  const { debut, fin } = state.settings.jour
  const a = Math.min(debut, fin), b = Math.max(debut, fin)
  const hs = []; for (let h = a; h <= b; h++) hs.push(h)
  // garde visibles les tranches planifiées hors plage
  Object.keys(dayData(selDay)).map(Number).forEach(h => { if (!hs.includes(h)) hs.push(h) })
  return hs.sort((x, y) => x - y)
}

function renderLegend() {
  $('legend').innerHTML = Object.values(CATS).map(c => `<span class="chip"><span class="dot" style="background:${v(c.c)}"></span>${c.label}</span>`).join('')
}

function renderWeek() {
  const fmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' })
  $('weekLabel').textContent = `Semaine du ${fmt.format(weekStart)} au ${fmt.format(addDays(weekStart, 6))}`
  const today = iso(new Date())
  $('week').innerHTML = JOURS.map((j, i) => {
    const d = addDays(weekStart, i), k = iso(d), counts = {}
    Object.values(dayData(k)).forEach(s => { counts[s.cat] = (counts[s.cat] || 0) + 1 })
    const mini = Object.keys(CATS).map(c => counts[c] ? `<span style="flex:${counts[c]};background:${v(CATS[c].c)}"></span>` : '').join('')
    return `<button class="day ${k === selDay ? 'sel' : ''} ${k === today ? 'today' : ''}" data-d="${k}" aria-pressed="${k === selDay}">
      <span class="dn">${j}</span><span class="dd">${d.getDate()}</span><span class="mini">${mini}</span></button>`
  }).join('')
}

function rappelLabel(s) {
  if (!s.rappel || s.rappel === 'defaut') return ''
  if (s.rappel === 'off') return '<span class="bell">sans rappel</span>'
  return `<span class="bell">🔔 ${s.rappel === '0' ? 'pile' : s.rappel + ' min'}</span>`
}

function renderDay() {
  const t = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(fromIso(selDay))
  $('dayTitle').textContent = t.charAt(0).toUpperCase() + t.slice(1)
  const dd = dayData(selDay), nowH = selDay === iso(new Date()) ? new Date().getHours() : -1
  $('slots').innerHTML = hoursRange().map(h => {
    const s = dd[h]
    const cell = s
      ? `<button class="cell" data-h="${h}" style="background:${v(CATS[s.cat].t)};border-left:4px solid ${v(CATS[s.cat].c)}">
           <span class="k">${CATS[s.cat].label} ${rappelLabel(s)}</span>${s.note ? `<span class="n">${esc(s.note)}</span>` : ''}</button>`
      : `<button class="cell empty" data-h="${h}"><span class="k">+ Choisir une activité</span></button>`
    return `<div class="slot ${h === nowH ? 'now' : ''}" id="slot-${h}"><span class="h">${pad(h)}:00</span><div>${cell}${openHour === h ? editor(h, s) : ''}</div></div>`
  }).join('')
}

function editor(h, s) {
  return `<div class="editor">
    <div class="cats">${Object.entries(CATS).map(([k, c]) =>
      `<button class="cat ${pendingCat === k ? 'on' : ''}" data-cat="${k}" style="${pendingCat === k ? `border-color:${v(c.c)}` : ''}"><span class="dot" style="background:${v(c.c)}"></span>${c.label}</button>`).join('')}</div>
    <label for="note-${h}">Note (facultatif)
      <input type="text" id="note-${h}" value="${s ? esc(s.note || '') : ''}" placeholder="Ex. : imprimer une rose en PLA">
    </label>
    <label for="rap-${h}">Rappel de cette tranche
      <select id="rap-${h}">${RAPPELS.map(([val, lab]) => `<option value="${val}" ${(s?.rappel ?? 'defaut') === val ? 'selected' : ''}>${lab}</option>`).join('')}</select>
    </label>
    <div class="row">
      <button class="btn primary" data-act="ok">Enregistrer</button>
      <button class="btn" data-act="ai">Conseil IA</button>
      ${s ? '<button class="btn" data-act="del">Vider</button>' : ''}
      <button class="btn" data-act="close">Fermer</button>
    </div></div>`
}

function renderStats() {
  const tot = {}; let all = 0
  for (let i = 0; i < 7; i++) Object.values(dayData(iso(addDays(weekStart, i)))).forEach(s => { tot[s.cat] = (tot[s.cat] || 0) + 1; all++ })
  const max = Math.max(1, ...Object.values(tot))
  $('stats').innerHTML = Object.entries(CATS).map(([k, c]) =>
    `<div class="bar"><span>${c.label}</span><span class="track"><span class="fill" style="width:${(tot[k] || 0) / max * 100}%;background:${v(c.c)}"></span></span><span class="v">${tot[k] || 0} h</span></div>`
  ).join('') + `<p class="hint">${all} heure${all > 1 ? 's' : ''} planifiée${all > 1 ? 's' : ''} cette semaine.</p>`
}

function renderPlanning() { renderWeek(); renderDay(); renderStats() }

function goToDay(k, h) {
  selDay = k; weekStart = monday(fromIso(k)); openHour = null
  showTab('planning'); renderPlanning()
  if (h != null) requestAnimationFrame(() => { const el = $('slot-' + h); if (el) el.scrollIntoView({ block: 'center' }) })
}

$('week').addEventListener('click', e => { const b = e.target.closest('.day'); if (b) { selDay = b.dataset.d; openHour = null; renderPlanning() } })
$('prev').onclick = () => { weekStart = addDays(weekStart, -7); selDay = iso(weekStart); openHour = null; renderPlanning() }
$('next').onclick = () => { weekStart = addDays(weekStart, 7); selDay = iso(weekStart); openHour = null; renderPlanning() }
$('todayBtn').onclick = () => goToDay(iso(new Date()))

$('slots').addEventListener('click', e => {
  const cell = e.target.closest('.cell')
  if (cell) {
    const h = +cell.dataset.h
    openHour = openHour === h ? null : h
    pendingCat = (dayData(selDay)[h] || {}).cat || null
    renderDay()
    return
  }
  const cat = e.target.closest('.cat')
  if (cat) {
    pendingCat = cat.dataset.cat
    document.querySelectorAll('.editor .cat').forEach(b => { const on = b.dataset.cat === pendingCat; b.classList.toggle('on', on); b.style.borderColor = on ? v(CATS[b.dataset.cat].c) : '' })
    return
  }
  const act = e.target.closest('[data-act]'); if (!act) return
  const h = openHour, noteEl = $('note-' + h), note = noteEl ? noteEl.value.trim() : '', rappel = $('rap-' + h)?.value || 'defaut'
  const a = act.dataset.act
  if (a === 'ok') {
    if (!pendingCat) { noteEl.placeholder = 'Choisis d’abord une catégorie ci-dessus'; noteEl.focus(); return }
    state.data[selDay] = state.data[selDay] || {}
    state.data[selDay][h] = { cat: pendingCat, note, ...(rappel !== 'defaut' ? { rappel } : {}) }
    saveData(); openHour = null; renderPlanning(); schedule()
  } else if (a === 'del') {
    if (state.data[selDay]) { delete state.data[selDay][h]; if (!Object.keys(state.data[selDay]).length) delete state.data[selDay] }
    saveData(); openHour = null; renderPlanning(); schedule()
  } else if (a === 'close') { openHour = null; renderDay() }
  else if (a === 'ai') {
    const lab = pendingCat ? CATS[pendingCat].label : 'activité libre'
    $('q').value = note
      ? `J'ai prévu une heure « ${lab} » : ${note}. Donne-moi des conseils concrets et étape par étape pour bien utiliser cette heure.`
      : `Propose-moi 3 idées concrètes pour une heure de « ${lab} », avec ce qu'il faut préparer.`
    showTab('ia'); ask()
  }
})
$('slots').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id?.startsWith('note-')) document.querySelector('[data-act="ok"]').click() })

// ---------- Onglets ----------
function showTab(t) {
  tab = t
  document.querySelectorAll('.tab').forEach(s => { s.hidden = s.id !== 'tab-' + t })
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t))
  window.scrollTo(0, 0)
  if (t === 'reglages') refreshStatus()
}
document.querySelector('.tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) showTab(b.dataset.tab) })

// ---------- Conseil IA ----------
const IDEAS = ['Comment créer une rose en impression 3D ?', 'Organiser 1 h de rangement efficace', '5 activités créatives en 1 heure', 'Méthode pour trouver des idées de projet', 'Séance de sport d\u2019une heure sans matériel', 'Repas simple à préparer en 45 min']
$('ideas').innerHTML = IDEAS.map(i => `<button class="chip" data-q="${esc(i)}">${esc(i)}</button>`).join('')
$('ideas').addEventListener('click', e => { const b = e.target.closest('[data-q]'); if (b) { $('q').value = b.dataset.q; ask() } })
$('ask').onclick = () => ask()
$('planAsk').onclick = () => {
  const dd = dayData(selDay)
  const lignes = Object.keys(dd).map(Number).sort((a, b) => a - b).map(h => `${h}h : ${CATS[dd[h].cat].label}${dd[h].note ? ' (' + dd[h].note + ')' : ''}`)
  $('q').value = lignes.length
    ? `Voici mon planning du jour :\n${lignes.join('\n')}\nDonne-moi des conseils pour mieux équilibrer et réussir cette journée.`
    : 'Ma journée est vide. Propose-moi un planning équilibré entre créatif, aide à la maison, temps libre, recherche d’idées/travail, sport et cuisine.'
  ask()
}
let busy = false
async function ask() {
  if (busy) return
  const out = $('answer'), q = $('q').value.trim()
  out.classList.remove('err')
  if (!q) { out.innerHTML = '<span class="hint">Écris une question d’abord.</span>'; return }
  busy = true; out.innerHTML = '<span class="spin"></span> Gemini réfléchit…'
  try { out.innerHTML = md(await askGemini(state.settings.ia.key.trim(), state.settings.ia.model.trim(), q)) }
  catch (e) { out.classList.add('err'); out.textContent = e.message }
  finally { busy = false }
}

// ---------- Réglages ----------
document.querySelectorAll('select[data-hours]').forEach(s => { s.innerHTML = Array.from({ length: 24 }, (_, h) => `<option value="${h}">${pad(h)}:00</option>`).join('') })
$('catChecks').innerHTML = Object.entries(CATS).map(([k, c]) =>
  `<label class="sw"><input type="checkbox" id="nc-${k}" data-path="notif.categories.${k}"><span class="dot" style="background:${v(c.c)}"></span>${c.label}</label>`).join('')

function fillSettings() {
  document.querySelectorAll('[data-path]').forEach(el => {
    const val = getPath(state.settings, el.dataset.path)
    if (el.type === 'checkbox') el.checked = !!val; else el.value = val ?? ''
  })
  syncDisabled()
}
function syncDisabled() {
  const n = state.settings.notif
  const dis = (ids, off) => ids.forEach(id => { $(id).disabled = off })
  dis(['n-avant-min'], !n.avant.on); dis(['n-fin-min'], !n.fin.on)
  dis(['n-h-deb', 'n-h-fin', 'n-h-libres'], !n.horaire.on)
  dis(['n-matin-h'], !n.matin.on); dis(['n-soir-h'], !n.soir.on)
  dis(['n-c-deb', 'n-c-fin'], !n.calme.on)
  document.querySelectorAll('#tab-reglages fieldset, #n-horizon, #testBtn').forEach(el => { el.disabled = !n.enabled })
}
$('tab-reglages').addEventListener('change', e => {
  const el = e.target; if (!el.dataset.path) return
  let val = el.type === 'checkbox' ? el.checked : el.value
  if ('num' in el.dataset) val = Number(val)
  setPath(state.settings, el.dataset.path, val)
  saveSettings(); syncDisabled()
  if (el.dataset.path === 'theme') applyTheme()
  if (el.dataset.path.startsWith('jour')) renderDay()
  if (el.dataset.path.startsWith('notif')) schedule()
})

function applyTheme() {
  const t = state.settings.theme
  if (t === 'auto') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = t
}

const PERM = { granted: ['Accordée', 'ok'], denied: ['Refusée', 'ko'], prompt: ['À demander', ''], 'prompt-with-rationale': ['À demander', ''], web: ['Appli Android uniquement', ''], erreur: ['Inconnue', 'ko'] }
async function refreshStatus() {
  const p = await permission(false), x = await exactStatus()
  const [pl, pc] = PERM[p] || [p, '']; $('permState').textContent = pl; $('permState').className = 'pill ' + pc
  $('permBtn').hidden = p === 'granted' || p === 'web'
  const [xl, xc] = x === 'granted' ? ['Accordées', 'ok'] : x === 'web' ? ['Appli Android uniquement', ''] : ['Refusées', 'ko']
  $('exactState').textContent = xl; $('exactState').className = 'pill ' + xc
  $('exactBtn').hidden = x === 'granted' || x === 'web'
}
$('permBtn').onclick = async () => { await permission(true); await refreshStatus(); schedule() }
$('exactBtn').onclick = async () => { await openExactSettings() }
$('testBtn').onclick = async () => { $('testMsg').textContent = await testNotif(); refreshStatus() }

$('exportBtn').onclick = async () => {
  const txt = exportJSON(); $('io').value = txt
  try { await navigator.clipboard.writeText(txt); $('ioMsg').textContent = 'Sauvegarde copiée (la clé API n’est pas incluse).' }
  catch (e) { $('io').select(); $('ioMsg').textContent = 'Sauvegarde affichée : sélectionne et copie le texte.' }
}
$('importBtn').onclick = () => {
  try { importJSON($('io').value); fillSettings(); applyTheme(); renderPlanning(); schedule(); $('ioMsg').textContent = 'Sauvegarde importée.' }
  catch (e) { $('ioMsg').textContent = e instanceof SyntaxError ? 'Texte illisible : colle la sauvegarde complète.' : e.message }
}
let resetArmed = false
$('resetBtn').onclick = () => {
  if (!resetArmed) { resetArmed = true; $('resetBtn').textContent = 'Confirmer : tout vider'; setTimeout(() => { resetArmed = false; $('resetBtn').textContent = 'Vider le planning' }, 4000); return }
  resetAll(); resetArmed = false; $('resetBtn').textContent = 'Vider le planning'; renderPlanning(); schedule(); $('ioMsg').textContent = 'Planning vidé.'
}

// ---------- Notifications ----------
let timer = null
function schedule() { clearTimeout(timer); timer = setTimeout(doSchedule, 600) }
async function doSchedule() {
  const r = await reschedule(state.data, state.settings)
  const fmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })
  let msg = `${r.plan.length} notification${r.plan.length > 1 ? 's' : ''} prévue${r.plan.length > 1 ? 's' : ''}`
  if (!r.native) msg += ' (aperçu : elles ne partent que dans l’appli Android)'
  else if (r.blocked) msg += ', mais bloquées : autorise les notifications ci-dessus'
  else if (r.error) msg += `. Erreur : ${r.error}`
  $('planCount').textContent = msg + (r.plan.length ? '. Prochaines :' : '.')
  $('upcoming').innerHTML = r.plan.slice(0, 6).map(p => `<li><time>${fmt.format(p.at)}</time><span><b>${esc(p.title)}</b>${esc(p.body)}</span></li>`).join('')
}

// ---------- Démarrage ----------
applyTheme(); renderLegend(); fillSettings(); renderPlanning()
initNotifs(extra => { if (extra.day) goToDay(extra.day, extra.hour) }).then(async () => {
  if (isNative && (await permission(false)) !== 'granted') await permission(true)
  schedule()
})
if (isNative) {
  App.addListener('appStateChange', ({ isActive }) => { if (isActive) { renderPlanning(); schedule(); if (tab === 'reglages') refreshStatus() } })
  App.addListener('backButton', () => {
    if (openHour !== null) { openHour = null; renderDay() }
    else if (tab !== 'planning') showTab('planning')
    else App.exitApp()
  })
}
