// Appel à l'API Gemini et rendu Markdown minimal

const SYSTEM = 'Tu es un coach pratique qui aide à bien utiliser des tranches d’une heure (créatif, aide à la maison, temps libre, recherche d’idées / travail, sport, cuisine). Réponds en français, de façon concrète et structurée : étapes numérotées, matériel ou logiciels utiles, durée estimée. Reste concis.'

export async function askGemini(key, model, question) {
  if (!key) throw new Error('Ajoute ta clé API Gemini dans Réglages › Conseil IA.')
  let r
  try {
    r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model || 'gemini-2.5-flash')}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents: [{ role: 'user', parts: [{ text: question }] }] })
    })
  } catch (e) { throw new Error('Impossible de joindre Gemini. Vérifie ta connexion internet.') }
  const j = await r.json().catch(() => ({}))
  if (!r.ok) {
    const msg = (j.error && j.error.message) || 'Erreur ' + r.status
    if (r.status === 400 || r.status === 403 || r.status === 404) throw new Error('Clé API refusée ou modèle inconnu. Vérifie la clé et le nom du modèle. (' + msg + ')')
    if (r.status === 429) throw new Error('Quota dépassé pour cette clé. Réessaie dans un moment.')
    throw new Error(msg)
  }
  const txt = ((j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || []).map(p => p.text || '').join('').trim()
  if (!txt) throw new Error('Pas de réponse (contenu peut-être filtré). Reformule la question.')
  return txt
}

export function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) }

export function md(s) {
  const inline = t => esc(t).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  let html = '', list = null
  const close = () => { if (list) { html += `</${list}>`; list = null } }
  for (const raw of s.split('\n')) {
    const l = raw.trimEnd(); let m
    if ((m = l.match(/^#{1,2}\s+(.*)/))) { close(); html += `<h3>${inline(m[1])}</h3>` }
    else if ((m = l.match(/^#{3,6}\s+(.*)/))) { close(); html += `<h4>${inline(m[1])}</h4>` }
    else if ((m = l.match(/^\s*[-*•]\s+(.*)/))) { if (list !== 'ul') { close(); html += '<ul>'; list = 'ul' } html += `<li>${inline(m[1])}</li>` }
    else if ((m = l.match(/^\s*\d+[.)]\s+(.*)/))) { if (list !== 'ol') { close(); html += '<ol>'; list = 'ol' } html += `<li>${inline(m[1])}</li>` }
    else if (!l.trim()) close()
    else { close(); html += `<p>${inline(l)}</p>` }
  }
  close(); return html
}
