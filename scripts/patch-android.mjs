// Ajoute les permissions de notification et l'icône de notification au projet Android généré par Capacitor.
// Sans effet si c'est déjà fait : on peut le relancer après chaque « cap sync ».
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('android/app/src/main')
const manifest = path.join(root, 'AndroidManifest.xml')
if (!fs.existsSync(manifest)) { console.error('Projet Android introuvable. Lance d\'abord : npx cap add android'); process.exit(1) }

let xml = fs.readFileSync(manifest, 'utf8')
const perms = [
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.SCHEDULE_EXACT_ALARM',
  'android.permission.RECEIVE_BOOT_COMPLETED',
  'android.permission.WAKE_LOCK',
  'android.permission.INTERNET'
]
const missing = perms.filter(p => !xml.includes(`"${p}"`))
if (missing.length) {
  const lines = missing.map(p => `    <uses-permission android:name="${p}" />`).join('\n')
  xml = xml.replace(/(\s*)<\/manifest>\s*$/, `\n${lines}\n</manifest>\n`)
  fs.writeFileSync(manifest, xml)
  console.log('Permissions ajoutées :', missing.join(', '))
} else console.log('Permissions déjà présentes.')

// Icône monochrome pour la barre d'état (une horloge simple)
const drawable = path.join(root, 'res/drawable')
fs.mkdirSync(drawable, { recursive: true })
fs.writeFileSync(path.join(drawable, 'ic_stat_notify.xml'), `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">
  <path android:fillColor="#FFFFFFFF"
      android:pathData="M12,2A10,10 0,1 0,22 12A10,10 0,0 0,12 2ZM12,20A8,8 0,1 1,20 12A8,8 0,0 1,12 20ZM12.5,7H11V13L16.2,16.2L17,14.9L12.5,12.2Z"/>
</vector>
`)
console.log('Icône de notification écrite.')
