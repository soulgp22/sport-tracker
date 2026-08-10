# known_bugs.md — Bugs rencontrés et comment ne pas les refaire

> Un bug corrigé s'écrit ici **et** donne un test dans [Tests.md](Tests.md).
> Lire ce fichier **avant** de diagnostiquer : le symptôme est peut-être déjà connu.
> Format : symptôme observable → cause racine → correctif → comment l'éviter.

---

## Le motif qui revient : l'erreur avalée en silence

**Trois bugs distincts, une même mécanique.** Une exception réelle est attrapée par
un `catch` qui la transforme en état d'apparence normale. Le défaut devient
invisible et survit des jours.

| Symptôme | Erreur avalée par |
|---|---|
| Écran blanc au démarrage | le `.catch()` interne du middleware `persist` de zustand |
| Health Connect toujours déconnecté | `catch { return null }` de `safeCall` |
| Bundles DOM accumulés | Gradle qui ignore un dossier produit par un outil tiers |

**Règle :** un `catch` qui renvoie une valeur de repli doit **journaliser** l'erreur
(au moins sous `__DEV__`). Le repli reste identique, mais l'échec cesse d'être muet.

---

## 1. L'app se lance et se ferme immédiatement (1.3.1)

**Symptôme** — écran de démarrage, puis le processus meurt. Aucun message.

**Cause** — `expo-navigation-bar` installé en version **canary**
(`56.0.4-canary-20260701`). Son `NavigationBarModule` implémentait
`com.facebook.react.interfaces.ExtraWindowEventListener`, interface absente de
React Native 0.85.3. Expo instancie **tous** ses modules natifs d'un bloc dans
`MainApplication.onCreate` : un seul module irrésolvable fait tomber l'application
entière, avant la première ligne de JavaScript.

```
java.lang.NoClassDefFoundError: Failed resolution of:
  Lexpo/modules/navigationbar/NavigationBarModule;
```

**Correctif** — épingler `expo-navigation-bar` en `56.0.3` (dernière stable).

**À éviter** — ne jamais installer de version canary/beta/rc. Le paquet a fini par
être retiré complètement en 1.3.7.

---

## 2. L'onboarding se relance à chaque démarrage

**Symptôme** — l'onboarding réapparaît alors qu'il a été complété.

**Cause** — la fonction `merge` du middleware `persist` retournait
`{ ...current, profile }`. `current` étant l'état initial (`completed: false`), le
champ `completed` sauvegardé n'était **jamais** restauré. La donnée était bien
écrite sur le disque, elle était ignorée à la relecture.

**Correctif** — restaurer explicitement chaque champ de `partialize`, avec repli
typé. Voir `src/store/onboardingStore.ts`.

**À éviter** — dans un `merge` personnalisé, **tout** champ de `partialize` doit
être restauré explicitement. Vérifier les autres stores persistés.

---

## 3. Écran blanc infini au démarrage

**Symptôme** — indicateur de chargement qui tourne indéfiniment, aucune erreur.

**Cause** — `merge` accédait à `persisted.profile` sans vérifier que `persisted`
soit un objet. Zustand peut l'appeler avec `undefined`, `null` ou un format
ancien. L'exception était avalée par le `.catch()` du middleware :
`onFinishHydration` n'était jamais appelé, `hasHydrated` restait faux pour
toujours.

**Correctif** — trois couches : `merge` défensive qui ne peut plus lever,
`onRehydrateStorage` (appelé sur le chemin succès **et** erreur), et un délai de
sécurité de 5 s si le stockage ne répond jamais.

**À éviter** — toute fonction appelée par un middleware qui avale les exceptions
doit être incapable de lever.

---

## 4. Le bandeau de boutons recouvre le texte des dialogues

**Symptôme** — sur une modale à message long, le bouton « Confirmer » s'affiche
par-dessus le texte.

**Cause** — `card: { maxHeight: '82%' }` alors que le parent `safe` n'avait
**aucune hauteur propre**. Un pourcentage se résout contre la hauteur du parent :
sans hauteur, il ne se résout pas et la carte croît sans limite. Un `flexShrink`
sur un enfant n'a alors rien à comprimer.

**Correctif** — hauteur absolue dérivée de `useWindowDimensions()`.

**À éviter** — un premier correctif (`flexShrink: 1`) traitait le symptôme et avait
été validé sur un diff et des tests verts. **Le bug persistait sur l'appareil.**
Une contrainte en pourcentage exige un parent dimensionné.

---

## 5. L'app n'apparaît pas dans Health Connect

**Symptôme** — impossible d'accorder les permissions santé : l'app n'est pas dans
la liste de Health Connect.

**Cause** — le manifeste n'exposait que
`androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE`, valable pour Android 13 avec
l'APK Health Connect séparé. Depuis **Android 14 (API 34)**, Health Connect est
intégré au système et ne liste que les applications exposant un `activity-alias`
avec `VIEW_PERMISSION_USAGE` + catégorie `HEALTH_PERMISSIONS`.

**Correctif** — passe `withAndroidManifest` dans `plugins/withHealthConnect.js`.

**À éviter** — « le code appelle l'API » ne veut pas dire « la fonctionnalité
marche ». Vérifier le manifeste **compilé** :
`aapt2 dump xmltree <apk> --file AndroidManifest.xml`.

---

## 6. Health Connect redemande la permission à chaque ouverture

**Symptôme** — le bouton « Connecter » revient à chaque lancement, et les données
restent à 0.

**Cause** — le SDK `react-native-health-connect` exige `initialize()` avant tout
appel. Il était appelé dans `requestPermissions` et `readCalories`, mais **pas**
dans `hasHealthPermissions`. L'appel levait, `safeCall` avalait l'exception et
retournait `null` → l'app concluait que la permission manquait, puis sortait de la
fonction **avant** de lire les données.

**Une seule cause, deux symptômes** : le second n'était qu'une conséquence du premier.

**Correctif** — helper `ensureInitialized(hc)` mémoïsé, appliqué partout.

---

## 7. L'APK grossit de ~8,5 Mo à chaque build

**Symptôme** — APK de 286 Mo contenant quatre copies du même bundle.

**Cause** — le viewer 3D est un composant DOM (`'use dom'`). Expo le compile en
bundle web écrit dans `android/app/build/generated/assets/react/<variante>/www.bundle/`,
sous un nom **haché qui change à chaque build**. Le dossier n'étant jamais vidé, le
nouveau fichier s'ajoutait à côté de l'ancien, et le packaging embarquait tout.

**Correctif** — `plugins/withCleanDomBundle.js` injecte une tâche Gradle qui vide
`www.bundle` avant chaque bundling. Versionné, donc valable sur toute machine et
sur EAS.

**À éviter** — un nettoyage manuel ne tient pas : `android/` est gitignoré.

---

## 8. `three` n'est pas une dépendance morte

**Symptôme** — après retrait de `three`, le bundling Metro échoue :
`Unable to resolve module three from @google/model-viewer`.

**Cause** — `@google/model-viewer` ne l'embarque pas, il le déclare en
`peerDependency` (`^0.183.0`).

**À éviter** — un paquet absent des imports du projet peut être **requis par une
dépendance**. Vérifier les `peerDependencies` avant de supprimer.

---

## 9. Les images des exercices ne s'affichent pas

**Symptôme** — catalogue sans illustrations.

**Cause** — trois causes empilées : seulement 22 exercices avaient une image
embarquée, `exerciseMedia` était un objet vide, et les URL pointaient vers un
dossier **suivi par Git LFS** — `raw.githubusercontent.com` renvoyait alors un
fichier pointeur de 130 octets au lieu de l'image.

**À éviter** — vérifier qu'une URL de média renvoie de vrais octets :

```bash
curl -sL "$MEDIA_BASE/offline-529.webp" | head -c 8 | grep -q RIFF \
  || echo "ERREUR: pointeur LFS ou fichier invalide"
```

---

## 10. Test dépendant de l'horloge réelle

**Symptôme** — un test passait le 14 juillet, échouait tous les autres jours.

**Cause** — fixtures à dates figées confrontées à `new Date()` dans le code testé.

**Correctif** — `now` injectable, valeur par défaut inchangée en production.

**À éviter** — aucun test ne doit dépendre de l'horloge, du réseau ou de l'ordre
d'exécution.

---

## Pièges d'outillage (pas des bugs applicatifs)

- **`adb emu kill` peut répondre OK sans tuer le processus.** Vérifier
  `tasklist | grep qemu` et forcer avec `taskkill //F //IM qemu-system-x86_64.exe`.
- **Health Connect *est* testable sur émulateur** : l'image Android 15 l'embarque
  via APEX. Ouvrir avec
  `adb shell am start -a android.health.connect.action.HEALTH_HOME_SETTINGS`.
- **Tester le mode trois boutons** (configuration la plus courante) :
  `adb shell cmd overlay enable com.android.internal.systemui.navbar.threebutton`.
- **Ne jamais filtrer la sortie d'un build** (`| tail`, `| grep`) : en cas
  d'échec, le message d'erreur est perdu. Rediriger vers un fichier.
- **`npm` standard est cassé sur cette machine** : utiliser celui de kimi-desktop.
