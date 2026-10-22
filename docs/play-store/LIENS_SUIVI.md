# Liens Play Store par canal — suivi des installations

> Créés le 2026-10-18 (plan marketing). **Rien n'est ajouté à l'app** : c'est la
> Play Console qui attribue les visites de la fiche et les installations à
> chaque lien, d'après ses paramètres UTM. Les cinq liens ont été ouverts le
> 2026-10-18 : tous mènent à la fiche (HTTP 200).

## Les liens

**TikTok (bio)**

```
https://play.google.com/store/apps/details?id=com.sportracker.app&utm_source=tiktok&utm_medium=social&utm_campaign=bio&referrer=utm_source%3Dtiktok%26utm_medium%3Dsocial%26utm_campaign%3Dbio
```

**Instagram (bio)**

```
https://play.google.com/store/apps/details?id=com.sportracker.app&utm_source=instagram&utm_medium=social&utm_campaign=bio&referrer=utm_source%3Dinstagram%26utm_medium%3Dsocial%26utm_campaign%3Dbio
```

**YouTube Shorts (description, bio)**

```
https://play.google.com/store/apps/details?id=com.sportracker.app&utm_source=youtube&utm_medium=social&utm_campaign=bio&referrer=utm_source%3Dyoutube%26utm_medium%3Dsocial%26utm_campaign%3Dbio
```

**Reddit (r/musculation)**

```
https://play.google.com/store/apps/details?id=com.sportracker.app&utm_source=reddit&utm_medium=communaute&utm_campaign=r-musculation&referrer=utm_source%3Dreddit%26utm_medium%3Dcommunaute%26utm_campaign%3Dr-musculation
```

**Créateur (exemple : pseudo « exemple »)**

```
https://play.google.com/store/apps/details?id=com.sportracker.app&utm_source=createur&utm_medium=influence&utm_campaign=exemple&referrer=utm_source%3Dcreateur%26utm_medium%3Dinfluence%26utm_campaign%3Dexemple
```

## Règle de nommage

| Paramètre | Valeur | Exemple |
|---|---|---|
| `utm_source` | la plateforme, en minuscules | `tiktok`, `instagram`, `youtube`, `reddit`, `createur` |
| `utm_medium` | le type de canal | `social` (nos comptes), `communaute` (forums), `influence` (créateurs) |
| `utm_campaign` | l'emplacement ou la personne | `bio`, `r-musculation`, le pseudo du créateur |

**Un créateur = un lien** : remplacer `exemple` par son pseudo (minuscules,
tirets, sans espace ni accent) aux **deux** endroits du lien, par exemple
`utm_campaign=marie-fit` et `utm_campaign%3Dmarie-fit`. Un nouveau forum :
`utm_source=reddit` (ou le nom du forum), `utm_medium=communaute`,
`utm_campaign` = le nom du fil ou du sous-forum.

**Pourquoi les paramètres apparaissent deux fois** : la Play Console lit les
UTM placés directement dans le lien de la fiche, et Google Play transmet aussi
le paramètre `referrer` (encodé) au téléchargement. Mettre les deux évite de
dépendre d'un seul des deux mécanismes ; le lien reste valide (moins de 512
caractères pour le `referrer`).

## Où lire les résultats

Play Console → Statistiques → **Acquisition des utilisateurs** → analyse de la
conversion de la fiche : filtrer par **source UTM** et **campagne UTM**
(le libellé exact peut varier selon la version de la console). Le canal
« Canaux suivis (UTM) » regroupe toutes les visites venues de ces liens.

**Limites à connaître** :
- seule une visite **par le lien** est attribuée : quelqu'un qui voit une vidéo
  puis cherche l'app par son nom compte dans « Recherche Google Play » ;
- les petits volumes sont regroupés dans « Autre » ;
- les campagnes Google Ads (App Campaign) s'attribuent seules, sans UTM.
