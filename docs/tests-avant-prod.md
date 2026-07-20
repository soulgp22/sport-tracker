# Portail de test avant production

> Objectif : qu'une fois cette procédure passée, la probabilité qu'un utilisateur
> rencontre un défaut bloquant soit faible et **mesurée**, pas espérée.

## Avertissement honnête, à lire en premier

**Aucune suite de tests ne garantit 100 %.** Quiconque prétend le contraire vend
quelque chose. Ce qui est atteignable :

- couvrir **tous les parcours qui, s'ils cassent, rendent l'app inutilisable** ;
- rendre **impossible** la réapparition silencieuse d'un bug déjà rencontré ;
- détecter en machine ce qui, aujourd'hui, n'est vu que par l'utilisateur.

Le reste — ergonomie, lenteurs subjectives, bizarreries d'un téléphone précis —
se traite par la piste de test fermé, pas par du code.

## La leçon des trois bugs du 2026-07-20

Ces trois défauts sont passés à travers **199 puis 206 tests verts**. Comprendre
pourquoi est plus utile que d'ajouter des tests au hasard.

| Bug | Pourquoi les tests ne l'ont pas vu | Barrière manquante |
|---|---|---|
| Onboarding relancé à chaque démarrage | aucun test ne recharge un état persisté | **niveau 3 — persistance** |
| Bouton recouvrant le texte du dialogue | RNTL affirme la *présence*, jamais la *mise en page* | **niveau 4 — E2E sur appareil** |
| Test « objectif hebdo » | fixtures à dates figées + `new Date()` réel | **règle de déterminisme** |

Trois angles morts distincts. Le premier concerne l'état entre deux lancements,
le second le rendu réel, le troisième la fiabilité des tests eux-mêmes.

---

## Les deux règles qui rendent un test digne de confiance

### Règle 1 — Un test doit pouvoir échouer

Avant d'ajouter un test, **casser volontairement le code** et vérifier qu'il vire au
rouge. S'il reste vert, il ne teste rien.

Contre-exemple vécu, sur le dialogue :

```tsx
// ❌ Passait AVANT et APRÈS le correctif : ne prouve rien.
expect(screen.getByText('Confirmer')).toBeTruthy();

// ✅ Échoue si l'on revient à maxHeight: '82%'
expect(typeof cardStyle.maxHeight).toBe('number');
```

### Règle 2 — Un test ne dépend jamais de l'horloge, du réseau ni de l'ordre

Tout ce qui varie sans que le code change doit être figé : date, aléatoire, fuseau,
locale, réseau. Un test qui ne passe que certains jours est **pire qu'absent** : il
crée une confiance fausse puis casse la CI sans rapport avec le changement en cours.

```ts
// ❌ Ne passe que pendant la semaine du 14 juillet 2026
const session = workout('new', '2026-07-18T10:00:00.000Z', ...);

// ✅ Horloge figée : déterministe tous les jours
jest.useFakeTimers().setSystemTime(new Date('2026-07-18T12:00:00.000Z'));
```

---

## Les six niveaux

Le coût monte et le nombre descend à mesure qu'on descend le tableau. On ne cherche
pas un pourcentage de couverture, on cherche que **chaque niveau attrape ce que le
précédent ne peut pas voir**.

### Niveau 0 — Statique (secondes)

```bash
npx tsc --noEmit          # typage strict, 0 erreur
npm run lint              # 0 erreur, 0 avertissement
```

À ajouter :
- `strict: true` dans `tsconfig.json` s'il n'y est pas ;
- **détection de code mort** (`knip` ou `ts-prune`) — évite les régressions du type
  `exerciseMedia` resté vide sans que personne ne s'en aperçoive ;
- **interdiction de `includes()` pour identifier** (règle ESLint personnalisée) :
  trois bugs de ce projet viennent de correspondances par sous-chaîne.

### Niveau 1 — Unitaire (secondes)

Fonctions pures : calculs nutritionnels, 1RM estimé, normalisation Open Food Facts,
mapping catégorie/unité, construction d'URL média.

Règle propre à ce projet : **tester la donnée produite, pas seulement la fonction
isolée.** Le bug « Nutella classé en Viande » avait été validé sur un tableau de deux
tags inventés ; le vrai produit en portait huit. Après chaque script de génération,
auditer un échantillon réel du fichier de sortie.

### Niveau 2 — Composant (secondes)

React Native Testing Library. Ce que ce niveau sait faire : présence, texte,
accessibilité, réaction aux interactions, états de chargement et d'erreur.

**Ce qu'il ne sait PAS faire : la mise en page.** Aucun moteur de layout ne tourne.
Un chevauchement, un texte tronqué, un élément hors écran sont **invisibles** ici.
Ne jamais conclure « le visuel est corrigé » depuis ce niveau — c'est l'erreur qui a
laissé passer le dialogue deux fois.

Exiger systématiquement :
- le cas **vide**, le cas **très long** (40+ lignes), le cas **erreur** ;
- les **4 langues**, l'allemand en priorité (mots longs → débordements) ;
- une assertion sur le **style calculé** quand le correctif est un style.

### Niveau 3 — Intégration et persistance (secondes) ⚠️ le trou actuel

C'est le niveau qui manque le plus. Il couvre le **cycle de vie des données**, pas
l'affichage.

Obligatoire pour chaque store persisté :

1. **Aller-retour** : écrire un état, recharger depuis le stockage, vérifier que
   *chaque champ de `partialize`* revient. Le bug de l'onboarding était exactement
   ça : `completed` sauvegardé, jamais relu.
2. **Migration** : un état de version *précédente* doit s'ouvrir sans perte
   (`gymProfileId` → `equipmentProfileId`, niveaux français hérités…).
3. **Données corrompues** : JSON invalide, champ manquant, type inattendu →
   l'app démarre en repli, **elle ne plante pas et ne perd rien**.
4. **Sauvegarde / restauration de profil** : export puis import doit redonner un
   état strictement équivalent.

Un test générique vaut mieux qu'un test par store : parcourir tous les stores
persistés et vérifier que la clé de `partialize` est restaurée. Ce test aurait
attrapé le bug de l'onboarding **sans que personne n'y pense**.

### Niveau 4 — Bout en bout sur appareil réel (minutes) ⚠️ le second trou

**Outil recommandé : [Maestro](https://maestro.dev/).** Scripts YAML, aucune
configuration native, moins de 1 % d'instabilité grâce aux attentes automatiques.
Detox est plus rapide par test mais exige une configuration native lourde ; à
réserver plus tard si un besoin de synchronisation fine apparaît.

C'est **le seul niveau qui voit réellement l'écran**. Il aurait attrapé le dialogue
du premier coup.

Parcours critiques à couvrir — si l'un casse, l'app est inutilisable :

```yaml
# .maestro/01-demarrage-a-froid.yaml
appId: com.sportracker.app
---
- launchApp: { clearState: true }
- assertVisible: "Bienvenue"        # onboarding au tout premier lancement
# … compléter l'onboarding …
- stopApp
- launchApp                          # 2e lancement, SANS clearState
- assertNotVisible: "Bienvenue"      # ⬅️ aurait attrapé le bug d'aujourd'hui
- assertVisible: "Accueil"
```

Liste minimale :

1. **Démarrage à froid + second démarrage** (l'onboarding ne revient pas)
2. **Réinstallation** : sauvegarde de profil → restauration → données intactes
3. **Séance complète** : choisir un programme → démarrer → valider des séries →
   minuteur → réduire le minuteur → naviguer → rouvrir → terminer
4. **Import de programme avec exercices inconnus** : le dialogue s'affiche,
   **le texte est lisible, aucun bouton ne le recouvre**, l'import aboutit
5. **Affichage des animations** : ouvrir une fiche d'exercice → l'image apparaît ;
   puis **en mode avion** → état d'erreur explicite, pas de cadre vide muet
6. **Changement de langue** : passer en allemand → parcourir les 5 écrans
   principaux → aucun texte tronqué, aucun français résiduel
7. **Nutrition** : ajouter un aliment, un repas, vérifier les totaux

Capturer une **capture d'écran à chaque étape** : Maestro les archive, ce qui donne
une comparaison visuelle d'une version à l'autre.

### Niveau 5 — Intégrité de la construction (minutes)

Ce niveau a déjà échoué en silence sur ce projet : la CI a cassé **du 4 au 19
juillet** parce que le checkout ne récupérait pas Git LFS, et personne ne l'a vu.

À vérifier automatiquement à chaque build :

- [ ] `lfs: true` sur le checkout, et **aucun fichier servi n'est un pointeur LFS**
      (un `.webp` de 130 octets = pointeur, pas image) ;
- [ ] les URLs média distantes répondent **200** avec un type MIME correct, sur la
      branche `main` (pas seulement en local) ;
- [ ] l'APK/AAB s'installe sur un appareil vierge et **démarre** ;
- [ ] taille du bundle sous surveillance (alerte si +10 % d'un coup) ;
- [ ] `versionCode` incrémenté, `versionName` cohérent.

Contrôle d'une ligne, qui aurait évité deux semaines de builds cassés :

```bash
curl -sL "$MEDIA_BASE/offline-529.webp" | head -c 8 | grep -q RIFF \
  || { echo "ERREUR: pointeur LFS ou fichier invalide"; exit 1; }
```

### Niveau 6 — Validation Google Play (heures à jours)

Ce que ni toi ni moi ne pouvons simuler : le parc d'appareils réels.

1. **Piste de test interne** — jusqu'à 100 testeurs, diffusion immédiate.
2. **[Rapport pré-lancement](https://support.google.com/googleplay/android-developer/answer/9842757)**
   — généré **automatiquement** à chaque dépôt sur une piste de test. Google exécute
   l'app sur un parc d'appareils physiques et remonte : plantages, performance,
   **accessibilité**, failles de sécurité et de vie privée. C'est le meilleur rapport
   qualité/effort disponible : il ne coûte qu'un dépôt.
3. **Piste de test fermée — ⚠️ 14 jours obligatoires** pour un compte personnel avant
   d'accéder à la production. **À planifier dès maintenant** : ce n'est pas une
   formalité de dernière minute, c'est deux semaines de calendrier.

---

## Le portail : la liste à cocher avant publication

Aucune publication si une case reste vide.

**Automatique (CI, bloquant)**
- [ ] `npx tsc --noEmit` → 0 erreur
- [ ] `npm run lint` → 0 erreur
- [ ] `npx jest --ci` → **0 échec** (pas « un seul test rouge, c'est un vieux truc »)
- [ ] parité des clés i18n sur les 4 langues
- [ ] tests de persistance : aller-retour + migration + données corrompues
- [ ] intégrité des médias : aucun pointeur LFS, URLs en 200 sur `main`
- [ ] suite Maestro : les 7 parcours critiques au vert

**Manuel (une fois par version)**
- [ ] installation par-dessus la version précédente : **aucune perte de données**
- [ ] mode avion : chaque écran dégrade proprement
- [ ] une langue autre que le français, de bout en bout
- [ ] thème clair **et** sombre
- [ ] un petit écran et un grand

**Google Play**
- [ ] rapport pré-lancement : **0 plantage**, avertissements examinés un par un
- [ ] test interne : au moins 48 h sans remontée bloquante
- [ ] test fermé : 14 jours (obligatoire, compte personnel)

---

## Ordre de mise en place

Ne pas tout construire d'un coup. Par retour sur investissement décroissant :

| Priorité | Chantier | Effort | Ce que ça attrape |
|---|---|---|---|
| **1** | Tests de persistance générique (niveau 3) | ~½ j | perte de données, onboarding, migrations |
| **2** | Maestro, parcours 1, 3, 4 | ~1 j | tout le visuel et la navigation |
| **3** | Contrôle d'intégrité média en CI | ~1 h | régression LFS, images vides |
| **4** | Règle de déterminisme + purge des tests temporels | ~½ j | CI instable, fausse confiance |
| **5** | Maestro, parcours 2, 5, 6, 7 | ~1 j | réinstallation, hors-ligne, i18n |
| **6** | Détection de code mort, règle anti-`includes` | ~½ j | classe entière de bugs déjà vécus |

**Environ 4 jours** pour passer de « des tests existent » à « le portail a du sens ».

---

## Ce que cette procédure ne couvrira toujours pas

À assumer, pas à masquer :

- **l'ergonomie** — un parcours peut être vert et pénible ;
- **les particularités constructeur** (Samsung, Xiaomi) sur les notifications et
  l'économie de batterie : seuls de vrais testeurs les voient ;
- **la lenteur perçue** sur appareil d'entrée de gamme ;
- **la justesse du contenu** — qu'un exercice soit correctement décrit ne se teste pas,
  ça se relit ;
- **la montée en charge des données** — 5 ans d'historique de séances.

Pour ces points, la piste de test fermée avec de vrais utilisateurs, plus la
surveillance des plantages en production (Sentry), valent mieux que n'importe quel
test automatisé.

---

## Sources

- [Maestro — frameworks de test React Native](https://maestro.dev/insights/best-react-native-testing-frameworks)
- [Detox vs Maestro : réduire l'instabilité](https://maestro.dev/insights/detox-vs-maestro-reducing-flakiness-react-native)
- [Mettre en place Maestro avec React Native](https://oneuptime.com/blog/post/2026-01-15-react-native-maestro-testing/view)
- [Rapports pré-lancement — Play Console](https://support.google.com/googleplay/android-developer/answer/9842757)
- [Comprendre le rapport pré-lancement](https://support.google.com/googleplay/android-developer/answer/9844487)
- [Tests interne / fermé / ouvert sur Google Play (2026)](https://primetestlab.com/blog/google-play-internal-vs-closed-vs-open-testing)
