# Mes Heures

Planificateur de journée par tranches d'une heure, avec conseils Gemini et notifications paramétrables. Appli Android faite avec Vite + Capacitor 7.

6 catégories : Créatif, Aide maison, Temps libre, Recherche idée / travail, Sport, Cuisine.

![Captures de Mes Heures](docs/captures-clair.png)

## Télécharger l'APK

La version compilée est disponible dans les **[Releases](../../releases/latest)** : télécharge `MesHeures.apk` dans la dernière version.

### Installer sur le téléphone

1. Ouvre `MesHeures.apk` depuis le téléphone (Fichiers, Téléchargements ou le navigateur).
2. Android demande d'autoriser l'installation d'applis inconnues pour cette source : accepte.
3. Au premier lancement, autorise les **notifications**.
4. Dans **Réglages › Notifications**, touche « Ouvrir le réglage » pour autoriser les **alarmes exactes** (Android 12 et plus), sinon les rappels peuvent arriver avec quelques minutes de retard.
5. Sur certains téléphones (Xiaomi, Huawei, Blackview…), désactive l'optimisation de batterie pour Mes Heures.

Il s'agit d'un APK de test (debug), non publié sur le Play Store. Android peut afficher un avertissement Play Protect : choisis « Installer quand même ».

Pour mettre à jour, installe le nouvel APK par-dessus l'ancien : le planning et les réglages sont conservés.

## Fonctions

- **Planning** : semaine en haut, journée en tranches d'une heure (plage réglable). Une tranche = une catégorie, une note facultative et un rappel facultatif.
- **Bilan de la semaine** : heures par catégorie.
- **Conseil IA** : questions libres à Gemini (« Comment créer une rose en impression 3D ? »), conseils sur une tranche ou sur la journée entière.
- **Réglages** : notifications, plage horaire, clé Gemini, thème (comme le téléphone, clair ou sombre), sauvegarde.

### Notifications

| Réglage | Effet |
|---|---|
| Rappel avant chaque tranche | à l'heure pile, 5, 10, 15, 30 min ou 1 h avant |
| Fin de tranche | prévient à la fin (ou 5/10 min avant) et dit ce qui suit |
| Catégories concernées | choisir quelles catégories déclenchent un rappel |
| Rappel par tranche | dans l'éditeur d'une tranche : délai propre ou aucun rappel |
| Point horaire | une notification chaque heure sur une plage, éventuellement seulement les heures libres |
| Programme du jour | résumé du jour à l'heure choisie |
| Préparer demain | résumé du lendemain le soir |
| Heures calmes | coupe les rappels automatiques la nuit |
| Programmer à l'avance | 3, 7 ou 14 jours |

Les notifications sont reprogrammées à chaque modification et à chaque ouverture de l'appli. Toucher une notification ouvre le jour et l'heure concernés.

### Conseil IA

Clé gratuite sur https://aistudio.google.com (« Get API key »), à coller dans **Réglages › Conseil IA**. Le modèle par défaut est `gemini-2.5-flash` ; tu peux le changer si Google en sort un plus récent. La clé reste sur le téléphone.

### Sauvegarde

**Réglages › Sauvegarde › Exporter** copie le planning et les réglages (sans la clé API). Colle ce texte puis touche « Importer » pour restaurer, par exemple sur un autre téléphone.

## Compiler soi-même (Windows)

Prérequis :
- Node.js 20 ou plus ;
- le SDK Android (installé avec Android Studio) ;
- un **JDK 21**. Le Java fourni avec les dernières versions d'Android Studio (Java 25) est trop récent pour Capacitor 7. Si aucun JDK 21 n'est trouvé, le script en propose un portable.

Ensuite :
1. Double-clique sur `build-apk.bat`.
2. Récupère `MesHeures.apk` dans le même dossier.

Le script cherche un JDK 21 et le SDK Android, crée le projet Android, ajoute les permissions de notification puis compile. Si le SDK n'est pas trouvé, il demande son chemin (Android Studio › Settings › Languages & Frameworks › Android SDK).

Erreurs courantes :

| Message | Solution |
|---|---|
| `Unsupported class file major version 69` ou `Java 8 JVM` | mauvais Java : il faut un JDK 21 |
| `SDK location not found` | supprime `android\local.properties` et relance le script |
| `fetch failed` / `SSL` pendant le téléchargement du JDK | télécharge https://aka.ms/download-jdk/microsoft-jdk-21-windows-x64.zip dans le navigateur et décompresse-le dans `%LOCALAPPDATA%\MesHeures\jdk21` |

Après une modification du code, relance simplement `build-apk.bat`.

### Avec GitHub Actions

L'action `Compiler l'APK` se lance à chaque push sur `main`, ou à la main depuis l'onglet Actions. L'APK se trouve dans les « Artifacts » de l'exécution.

## Publier une nouvelle version

1. Augmente `version` dans `package.json` (par exemple `1.1.0`).
2. Compile l'APK.
3. Sur GitHub : **Releases › Draft a new release**, tag `v1.1.0`, puis glisse `MesHeures.apk` dans les fichiers joints.

## Licence

Copyright (C) 2026 fLO

Mes Heures est un logiciel libre : tu peux le redistribuer et/ou le modifier selon les termes de la **GNU General Public License** publiée par la Free Software Foundation, version 3 ou (à ton choix) toute version ultérieure.

Il est distribué dans l'espoir d'être utile, mais **sans aucune garantie**, sans même la garantie implicite de qualité marchande ou d'adéquation à un usage particulier. Voir le fichier [LICENSE](LICENSE) pour le texte complet.

En résumé : chacun peut utiliser, étudier, modifier et partager l'appli, à condition que toute version redistribuée (modifiée ou non) reste sous GPL v3 avec son code source disponible.
