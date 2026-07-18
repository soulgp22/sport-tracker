# Système de performance

## Objectif et périmètre

Le tableau de performance compare une estimation de force relative, exercice par
exercice. Les données restent locales au téléphone. La première version ne
prétend pas classer l'utilisateur dans la communauté Life Sport Tracker : elle
affiche une estimation de référence issue de compétitions OpenIPF.

Les comparaisons sont volontairement limitées au développé couché, au squat et
au soulevé de terre. Les variantes compatibles sont définies dans
`src/config/performance-rules.json` par identifiants et synonymes normalisés.

## Calculs

Pour une série de 1 à 15 répétitions, l'application estime le 1RM avec la moyenne
des formules suivantes :

- Epley : `charge × (1 + répétitions / 30)` ;
- Brzycki : `charge × 36 / (37 - répétitions)`.

Le résultat reçoit un niveau de confiance : élevé jusqu'à 5 répétitions,
modéré de 6 à 10, faible de 11 à 15. Les séries au-delà de 15 répétitions ne
sont pas utilisées. Le score relatif est `1RM estimé / poids de corps` en
utilisant la pesée la plus proche de la date de la séance.

Le moteur conserve aussi l'historique des records estimés, les séries de jours
d'entraînement et la progression vers les objectifs hebdomadaires et mensuels.

## Référence externe — phase 1

`src/config/openipf-reference.json` est construit depuis l'export OpenIPF. Le
script sélectionne une meilleure performance par athlète parmi les compétitions
récentes, testées antidopage, Raw et SBD, puis produit les seuils de ratio par
sexe pour les percentiles 50, 75, 90, 95, 97 et 99.

Cette référence est une estimation : une population de compétiteurs de
powerlifting n'est pas représentative de tous les pratiquants de salle. L'âge
et l'expérience sont enregistrés de façon optionnelle, mais ne modifient pas
encore les seuils de la phase 1.

Pour rafraîchir le fichier après téléchargement du dernier export officiel :

```powershell
python scripts/build-performance-reference.py openipf-latest.zip src/config/openipf-reference.json
```

La date, la révision, les filtres et la taille de chaque échantillon sont inclus
dans le JSON généré afin que le résultat reste auditable.

## Référence communautaire — phase 2

Le moteur expose déjà un calcul de percentile empirique pour des groupes
comparables : exercice, sexe, tranche de poids et, si disponible, tranche d'âge.
Il refuse d'afficher un percentile tant que l'échantillon n'atteint pas le seuil
configuré (`communityPhase.minimumComparableSample`, actuellement 200).

La phase 2 nécessitera un service distant avec consentement explicite,
pseudonymisation, suppression à la demande, contrôles anti-doublons et
anti-fraude, et publication de la taille de l'échantillon. Aucun score
communautaire n'est inventé tant que ce service n'existe pas.

## Configuration

Les règles métier ne sont pas dispersées dans l'interface :

- `src/config/performance-rules.json` : formules, confiance, exercices,
  niveaux, badges, objectifs, seuil communautaire et messages ;
- `src/config/openipf-reference.json` : percentiles de référence et provenance ;
- `src/lib/performanceEngine.ts` : moteur pur et testable ;
- `src/lib/performanceNotifications.ts` : sélection d'un fait réellement
  observé avant programmation d'une notification locale ;
- `src/store/performanceStore.ts` : préférences et récompenses persistées.

Les notifications sont désactivées par défaut. Elles ne sont activées qu'après
une action explicite dans les paramètres et ne citent que des records, niveaux,
écarts calculés ou objectifs réellement présents dans les données locales.
