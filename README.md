# Mes Heures

Planificateur de journée par tranches d'une heure (Créatif, Aide maison, Temps libre, Recherche idée / travail, Sport, Cuisine), avec conseils Gemini et notifications paramétrables. Appli Android faite avec Vite + Capacitor 7.

## Compiler l'APK sous Windows

Prérequis : Node.js 20 ou plus, Android Studio (SDK Android + JDK 21 fournis avec).

1. Dézipper le dossier, par exemple dans `D:\mes-heures`.
2. Double-cliquer sur `build-apk.bat`.
3. Récupérer `MesHeures.apk` dans le même dossier et l'installer sur le téléphone.

Si Gradle ne trouve pas le SDK, crée `android\local.properties` avec :

```
sdk.dir=C\:\\Users\\TON_NOM\\AppData\\Local\\Android\\Sdk
```

ou ouvre le projet une fois dans Android Studio avec `npx cap open android`.

Après une modification du code : `npm run android:sync`, puis relance `build-apk.bat`.

## Compiler avec GitHub

Pousse le dossier sur un dépôt GitHub. L'action `Compiler l'APK` se lance à chaque push sur `main`, ou à la main depuis l'onglet Actions. L'APK est dans les « Artifacts » de l'exécution.

## Notifications

Réglages › Notifications :

| Réglage | Effet |
|---|---|
| Rappel avant chaque tranche | à l'heure pile, 5, 10, 15, 30 min ou 1 h avant |
| Fin de tranche | prévient à la fin (ou 5/10 min avant) et dit ce qui suit |
| Catégories concernées | choisir quelles catégories déclenchent un rappel |
| Rappel par tranche | dans l'éditeur d'une tranche : délai propre ou aucun rappel |
| Point horaire | une notification chaque heure dans une plage, éventuellement seulement les heures libres |
| Programme du jour | résumé du jour à l'heure choisie |
| Préparer demain | résumé du lendemain le soir |
| Heures calmes | coupe les rappels automatiques la nuit |
| Programmer à l'avance | 3, 7 ou 14 jours |

Les notifications sont reprogrammées à chaque modification et à chaque ouverture de l'appli. Appuyer sur une notification ouvre le jour et l'heure concernés.

Sur Android 12 et plus, autorise les « alarmes exactes » (bouton dans les réglages) pour des rappels à la minute près. Sur certains téléphones (Xiaomi, Huawei, Blackview…), désactive aussi l'optimisation de batterie pour Mes Heures, sinon les rappels peuvent être retardés.

## Conseil IA

Clé gratuite sur https://aistudio.google.com (« Get API key »), à coller dans Réglages › Conseil IA. Le modèle par défaut est `gemini-2.5-flash` ; tu peux le changer si Google en sort un plus récent.

## Sauvegarde

Réglages › Sauvegarde › Exporter copie tout le planning et les réglages (sans la clé API). Colle ce texte et touche « Importer » pour restaurer.
