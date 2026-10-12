// Planification des notifications locales (Android) à partir du planning et des réglages
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { buildPlan } from './plan.js'

export const isNative = Capacitor.isNativePlatform()
const TEST_ID = 900001

export async function initNotifs(onTap) {
  if (!isNative) return
  const ch = [
    { id: 'planning', name: 'Tranches planifiées', description: 'Rappels avant et à la fin de vos tranches', importance: 4 },
    { id: 'horaire', name: 'Point horaire', description: 'Notification chaque heure', importance: 3 },
    { id: 'resume', name: 'Résumés du jour', description: 'Programme du matin et préparation du lendemain', importance: 3 }
  ]
  for (const c of ch) { try { await LocalNotifications.createChannel({ ...c, visibility: 1, vibration: true }) } catch (e) {} }
  LocalNotifications.addListener('localNotificationActionPerformed', a => onTap((a.notification && a.notification.extra) || {}))
}

export async function permission(request = false) {
  if (!isNative) return 'web'
  try {
    let p = await LocalNotifications.checkPermissions()
    if (p.display !== 'granted' && request) p = await LocalNotifications.requestPermissions()
    return p.display
  } catch (e) { return 'erreur' }
}

export async function exactStatus() {
  if (!isNative) return 'web'
  try { return (await LocalNotifications.checkExactNotificationSetting()).exact_alarm } catch (e) { return 'granted' }
}
export async function openExactSettings() {
  try { await LocalNotifications.changeExactNotificationSetting() } catch (e) {}
}

export async function reschedule(data, settings) {
  const plan = buildPlan(data, settings, new Date())
  if (!isNative) return { count: plan.length, plan, native: false }
  try {
    const pend = await LocalNotifications.getPending()
    const old = pend.notifications.filter(n => n.id !== TEST_ID).map(n => ({ id: n.id }))
    if (old.length) await LocalNotifications.cancel({ notifications: old })
    if (!plan.length) return { count: 0, plan, native: true }
    if ((await permission(false)) !== 'granted') return { count: 0, plan, native: true, blocked: true }
    const list = plan.map(p => ({
      id: p.id, title: p.title, body: p.body, channelId: p.channel, extra: p.extra,
      schedule: { at: p.at, allowWhileIdle: true },
      smallIcon: 'ic_stat_notify', iconColor: '#2f5d50'
    }))
    for (let i = 0; i < list.length; i += 100) await LocalNotifications.schedule({ notifications: list.slice(i, i + 100) })
    return { count: list.length, plan, native: true }
  } catch (e) {
    return { count: 0, plan, native: true, error: e.message || String(e) }
  }
}

export async function testNotif() {
  if (!isNative) return 'Les notifications ne fonctionnent que dans l’appli Android.'
  if ((await permission(true)) !== 'granted') return 'Notifications refusées. Autorise-les dans les réglages Android de l’appli.'
  await LocalNotifications.schedule({ notifications: [{
    id: TEST_ID, title: 'Mes Heures · test', body: 'Les notifications fonctionnent.', channelId: 'planning',
    schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true }, smallIcon: 'ic_stat_notify', iconColor: '#2f5d50'
  }] })
  return 'Notification de test prévue dans 5 secondes.'
}
