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
| Politique de confidentialité (URL) | Hébergée en ligne | Voir `POLITIQUE_CONFIDENTIALITE.md` — à héberger (GitHub Pages gratuit) |

## Checklist publication

- [ ] Build AAB production (`eas build --platform android --profile production`)
- [ ] AAB testé sur téléphone via piste de test interne
- [ ] Icône 512×512 + bannière 1024×500 uploadées
- [ ] 2 à 8 captures d'écran uploadées
- [ ] Description courte + longue collées
- [ ] URL politique de confidentialité renseignée
- [ ] Data Safety rempli (aucune donnée collectée)
- [ ] Questionnaire IARC rempli
- [ ] Prix : gratuit, pays : monde (ou sélection)
- [ ] Envoi en révision (piste : test interne → production)
