# Fiche Play Store — Life Sport Tracker

> Tous les textes prêts à copier-coller dans la Play Console.

## Titre de l'application (30 car. max)

```
Life Sport Tracker
```

## Description courte (80 car. max)

```
Suivi de musculation complet : séances, programmes, minuteur et animations 3D.
```
(76 caractères)

## Description longue (4000 car. max)

```
Life Sport Tracker est votre carnet d'entraînement de musculation, pensé pour la salle.

SUIVEZ VOS SÉANCES
• Enregistrez vos exercices, séries, répétitions et charges en quelques gestes
• Historique complet pour visualiser votre progression
• Minuteur de repos intégré avec notification de fin

DES PROGRAMMES PRÊTS À L'EMPLOI
• Programmes d'entraînement structurés par objectif
• Plus de 180 exercices référencés et expliqués
• Personnalisez chaque séance selon votre niveau

DES ANIMATIONS 3D EXCLUSIVES
• Visualisez la bonne exécution des mouvements grâce à des mannequins 3D
• Rotation libre : observez chaque exercice sous tous les angles

100 % HORS LIGNE, 0 % ESPIONNAGE
• Fonctionne entièrement sans connexion Internet
• Aucune donnée ne quitte votre téléphone : pas de compte, pas d'analytics, pas de publicité
• Vos séances vous appartiennent, stockées uniquement sur votre appareil

Que vous débutiez ou que vous soyez un pratiquant confirmé, Life Sport Tracker
vous aide à rester régulier, à progresser et à garder la trace de chaque répétition.

Téléchargez Life Sport Tracker et entraînez-vous avec méthode.
```

## Catégorie

- **Catégorie principale** : Santé et remise en forme (Health & Fitness)
- **Tags suggérés** : musculation, fitness, workout tracker, gym

## Formulaire « Sécurité des données » (Data Safety)

Réponses à donner dans la Play Console :

| Question | Réponse |
|---|---|
| Votre appli collecte-t-elle des données ? | **Non** |
| Partage de données avec des tiers | **Non** |
| Données chiffrées en transit | Sans objet (aucune transmission) |
| Suppression des données | Les données sont sur l'appareil, supprimées à la désinstallation |

→ Avec une app 100 % locale, le formulaire se remplit en 5 minutes et c'est un
argument de confiance fort sur la fiche.

## Classification du contenu (questionnaire IARC)

- Violence : non
- Contenu pour adulte : non
- Interaction utilisateur : non
- Partage de position : non
- Achats intégrés : **non** (à confirmer si monétisation future des animations)
→ Classification attendue : **PEGI 3 / Tout public**

## Assets graphiques à produire

| Asset | Dimensions | Statut |
|---|---|---|
| Icône haute résolution | 512×512 PNG | À exporter depuis `assets/images/` |
| Bannière (feature graphic) | 1024×500 PNG/JPG | **À créer** |
| Captures d'écran téléphone (2 min, 8 max) | 1080×1920 min | **À capturer** : accueil, séance en cours, minuteur, animation 3D, programme |
| Politique de confidentialité (URL) | Hébergée en ligne | `POLITIQUE_CONFIDENTIALITE.md` est **publiable tel quel** (réécrit le 2026-08-27) — reste à héberger : GitHub Pages n'est pas activé sur le dépôt |

## Checklist publication

- [ ] Build AAB production (`eas build --platform android --profile production`)
- [ ] AAB testé sur téléphone via piste de test interne
- [ ] Icône 512×512 + bannière 1024×500 uploadées
- [ ] 2 à 8 captures d'écran uploadées
- [ ] Description courte + longue collées
- [ ] URL politique de confidentialité renseignée
- [ ] Data Safety rempli — **l'ancienne réponse « aucune donnée collectée » est FAUSSE**, voir ci-dessous
- [ ] Déclaration « Applis de santé » remplie (obligatoire : l'app lit Health Connect)
- [ ] Questionnaire IARC rempli
- [ ] Prix : gratuit, pays : monde (ou sélection)
- [ ] Envoi en révision (piste : test interne → production)


---

## Points de conformité à ne pas rater (constats du 2026-08-27)

### Data Safety : « aucune donnée collectée » est faux

Au sens de Google, « collecté » signifie **transmis hors de l'appareil**. Or :

| Donnée | Sort de l'appareil ? | Détail |
|---|---|---|
| Photo de repas | **oui** | envoyée au serveur, relayée à Gemini, **non conservée** — cocher « traitement éphémère » |
| Numéro de code-barres | **oui** | proxy `/v1/products/` vers Open Food Facts |
| Nom d'un aliment inconnu | **oui** | Gemini + cache partagé |
| Corrections d'estimation (texte) | **oui, si opt-in** | désactivé par défaut, jamais d'image |
| Données Health Connect (pas, calories) | **non** | lues et utilisées uniquement sur l'appareil |
| Séances, journal, poids, préférences | **non** | stockage local |

Le mapping exact vers les catégories Google reste à faire dans le formulaire :
les libellés de Play évoluent, mieux vaut les lire au moment de remplir que se
fier à cette table pour le nom des cases. Ce qui est certain, c'est que la
réponse « aucune donnée collectée » ne tient plus.

### Permissions déclarées mais inutilisées

`RECORD_AUDIO` (microphone) et `SYSTEM_ALERT_WINDOW` (superposition d'écran)
sont dans le manifeste généré alors qu'aucune ligne du code applicatif ne les
utilise — elles viennent de dépendances. Déclarer le micro sans s'en servir est
un motif de question chez Play et oblige la politique de confidentialité à s'en
expliquer. **À retirer du manifeste** (`app.json` → `android.blockedPermissions`,
puis rebuild et vérification avec `adb shell dumpsys package`).

### Journalisation du serveur

La section 3.6 de la politique est rédigée au conditionnel : le `Caddyfile` du
VPS n'a pas été lu. La formulation reste vraie que le serveur journalise ou non.
À resserrer si la configuration est vérifiée un jour.
