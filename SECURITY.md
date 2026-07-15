# Sécurité — Sport Tracker

## Modèle de données

Sport Tracker fonctionne sans compte ni backend. Les programmes, séances, mesures corporelles et données nutritionnelles sont conservés localement avec AsyncStorage.

AsyncStorage repose sur l'espace privé de l'application, mais ne chiffre pas les données applicatives. Un appareil compromis, une sauvegarde système mal protégée ou un fichier de profil partagé peuvent donc exposer ces informations.

## Sauvegardes et imports

- Les sauvegardes de profil JSON contiennent des données sport et nutrition en clair. Elles doivent être stockées dans un emplacement privé.
- Les fichiers temporaires de sauvegarde mobile sont supprimés après l'ouverture de la feuille de partage.
- Les imports JSON et CSV sont limités à 5 Mo avant lecture et avant parsing.
- Les données importées sont validées avant d'être ajoutées aux stores.

## Contenu communautaire

Le manifeste communautaire est téléchargé en HTTPS depuis le dépôt officiel. Les chemins de fichiers sont limités à des noms JSON simples, les identifiants dupliqués sont refusés et les réponses sont limitées en taille.

Le compte GitHub qui héberge le manifeste reste une dépendance de confiance : tout changement de propriétaire ou de canal de publication doit déclencher une revue de sécurité.

## Permissions mobiles

- La permission de notification est demandée au premier lancement d'un timer de repos, au moment où son utilité est compréhensible.
- Android utilise `SCHEDULE_EXACT_ALARM` pour le timer. `USE_EXACT_ALARM` n'est pas déclaré.
- Toute nouvelle permission doit être justifiée par une fonctionnalité visible et testée sur appareil.

## Vérifications avant publication

```bash
npm run typecheck
npm test
npm run lint
npx expo install --check
npm audit
```

Ne pas appliquer automatiquement `npm audit fix --force` : une proposition de correction qui change de version majeure doit être analysée et testée séparément.

Référence de contrôle : [OWASP MASVS](https://mas.owasp.org/MASVS/), en particulier les catégories STORAGE, NETWORK, PLATFORM et PRIVACY.
