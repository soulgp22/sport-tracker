# Tests.md — Stratégie de test

> **Règle fondatrice : un bug corrigé = un test qui l'aurait attrapé.**
> Le bug s'écrit dans [known_bugs.md](known_bugs.md), le test s'écrit ici et dans le code.
> Le portail complet avant publication : [docs/tests-avant-prod.md](docs/tests-avant-prod.md).

---

## Les deux règles qui décident de tout

### 1. Un test qui ne peut pas échouer ne prouve rien

Après avoir écrit un test de régression, **réintroduire volontairement le défaut**
et vérifier qu'il rougit. Puis restaurer.

C'est non négociable : un test de dialogue avait été écrit, validé, commité — il
passait **avant comme après** le correctif. Il ne prouvait rien, et le bug est
resté en production.

```bash
cp src/lib/monModule.ts /tmp/sauvegarde.bak
# réintroduire le défaut
npx jest src/lib/__tests__/monModule.test.ts --ci   # doit ROUGIR
cp /tmp/sauvegarde.bak src/lib/monModule.ts
```

Attendu : **exactement** les tests visés rougissent, les voisins restent verts. Si
tout rougit, le test est trop large ; si rien ne rougit, il est inutile.

### 2. Aucune dépendance à l'horloge, au réseau ou à l'ordre

Un test qui passait le 14 juillet et échouait les autres jours a failli bloquer la
CI. Toute date doit être injectée, jamais lue depuis `new Date()` dans le code
testé.

---

## Commandes

| Quoi | Commande |
|---|---|
| Typage | `npx tsc --noEmit` |
| Tests | `npx jest --ci` |
| Un fichier | `npx jest <chemin> --ci` |
| Lint | `npm run lint` |

⚠️ Utiliser le `npx` de kimi-desktop (le npm standard est cassé sur cette machine).

**État actuel : 43 suites / 347 tests.** Toute baisse du total doit être
**explicable** — nombre exact de cas retirés, et pourquoi. Une baisse inexpliquée
est une régression déguisée.

---

## Ce qui est couvert

| Domaine | Fichier | Ce qu'il protège |
|---|---|---|
| Hydratation du store | `src/store/__tests__/onboardingStore.test.ts` | `merge` ne peut plus lever, `completed` restauré |
| Dialogues | `src/components/ui/__tests__/AppDialog.test.tsx` | hauteur bornée en pixels, pas en pourcentage |
| Health Connect | `src/lib/__tests__/healthConnect.test.ts` | `initialize()` avant lecture des permissions |
| Bilan énergétique | `src/lib/__tests__/energyBalance.test.ts` | conversion pas → kcal, hiérarchie des 4 sources |
| Capacité photo | `src/lib/__tests__/mealPhotoCapability.test.ts` | garde-fou quand la config serveur manque |
| Scan code-barres | `src/lib/__tests__/openFoodFacts.test.ts` | passerelle `/v1/products`, les 4 cas : trouvé, introuvable, serveur non configuré, injoignable |
| Notifications | `src/lib/__tests__/performanceNotifications.test.ts` | déterminisme (`now` injecté) |
| i18n | test de parité | les 4 langues (fr, en, es, de) restent complètes |

---

## Ce qui n'est PAS couvert — et le sera par un humain

Ces vérifications n'existent que sur appareil ou à l'écran. Les tests unitaires
ne les remplacent pas.

| À vérifier | Pourquoi les tests ne suffisent pas |
|---|---|
| Démarrage de l'APK release | trois crashs sont passés avec tous les tests verts |
| Rendu visuel après changement de mise en page | CSS et markup valides séparément peuvent ne plus se connaître |
| Health Connect avec de vraies données | l'émulateur n'a aucune donnée de santé |
| Viewer 3D | les exercices avec modèle ne sont pas dans le catalogue de base |

---

## Validation avant publication — obligatoire

Un `eas submit` n'est légitime qu'après :

1. `npx tsc --noEmit` → 0 erreur
2. `npx jest --ci` → 0 échec
3. build release réussi
4. **APK installé et lancé sur l'émulateur** `SportTracker_Pixel8`
5. `adb logcat -b crash -d` → **vide**
6. AAB signé avec la clé EAS (`META-INF/E96922A6.RSA`)

L'étape 4 aurait évité un crash publié à tous les testeurs, pour quinze secondes
de test.

Tester aussi le **mode trois boutons**, configuration la plus répandue :

```bash
adb shell cmd overlay enable com.android.internal.systemui.navbar.threebutton
```

---

## Ne jamais affaiblir un test pour faire passer la validation

Interdit : supprimer une assertion gênante, ajouter un `skip`, élargir une
tolérance, retirer un cas. Si un test échoue, soit le code est faux, soit le test
l'est — dans les deux cas il faut comprendre avant de toucher.

Un exécutant qui rapporte « tout est vert » doit être **vérifié** : relancer les
tests soi-même et lire le diff.
