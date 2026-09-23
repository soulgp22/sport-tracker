# Politique de confidentialité — Life Sport Tracker

*Dernière mise à jour : 23 septembre 2026*

## Résumé

Life Sport Tracker fonctionne **sans compte** et stocke l'essentiel de vos
données **sur votre appareil**. Quelques fonctionnalités font exception et
nécessitent une connexion à un serveur : l'**analyse photo d'un repas** (et sa
limite quotidienne), le **scan d'un code-barres**, le **téléchargement de
catalogues** et l'**abonnement** facultatif. Elles sont détaillées ci-dessous.

Aucune publicité, aucun traceur, aucun service d'analyse d'audience, aucune
revente de données.

## 1. Données stockées uniquement sur votre appareil

L'application enregistre dans le stockage local de votre téléphone :

- vos séances d'entraînement et votre historique d'exercices ;
- vos programmes et leurs personnalisations ;
- votre journal alimentaire et vos objectifs nutritionnels ;
- vos pesées et votre historique de poids ;
- vos préférences d'affichage, de langue et de notifications.

Ces données **ne sont jamais transmises**. Elles sont supprimées définitivement
si vous désinstallez l'application ou effacez ses données dans les réglages
Android. La fonction de sauvegarde produit un fichier que **vous** choisissez
d'enregistrer ou de partager : son contenu ne transite par aucun serveur.

## 2. Données de santé (Health Connect)

Avec votre autorisation explicite, et uniquement si vous l'accordez,
l'application lit dans Health Connect :

| Donnée | Permission Android | Usage |
|---|---|---|
| Nombre de pas du jour | `READ_STEPS` | affichage de votre activité quotidienne |
| Calories actives du jour | `READ_ACTIVE_CALORIES_BURNED` | estimation de la dépense énergétique |
| Calories totales du jour | `READ_TOTAL_CALORIES_BURNED` | bilan énergétique du journal nutritionnel |

Ces données sont lues **en lecture seule**, utilisées **uniquement sur
l'appareil** pour l'affichage et le calcul du bilan énergétique, et **ne sont
transmises à aucun serveur**, ni au nôtre ni à un tiers. L'application n'écrit
jamais dans Health Connect.

Vous pouvez retirer cette autorisation à tout moment depuis les réglages de
Health Connect. L'application continue alors de fonctionner : seuls l'affichage
des pas et l'estimation de dépense disparaissent.

## 3. Données transmises à un serveur

Le serveur d'analyse est **opéré par Rais&Co**, hébergé sur un serveur privé
loué chez Hetzner, **en Allemagne** — donc au sein de l'Union européenne : vos
données ne font l'objet d'aucun transfert hors UE de notre fait. Toutes les
communications se font en HTTPS.

Seule exception, explicitement signalée en 3.1 et 3.3 : les requêtes relayées à
Google Gemini sont traitées selon les conditions et la localisation de Google.

### 3.1 Analyse photo d'un repas

Quand vous demandez l'analyse d'une photo de plat, **l'image est envoyée** à ce
serveur, qui la transmet à **Google Gemini** pour reconnaissance des aliments.
Le résultat (noms d'aliments et quantités estimées) revient à l'application.

- L'image n'est envoyée **que** lorsque vous déclenchez explicitement l'analyse.
- **Elle n'est pas conservée** sur notre serveur : elle est transmise pour
  analyse, puis écartée. Aucun historique de photos n'est constitué — sauf si
  vous activez le réglage facultatif décrit en 3.5.
- Le traitement par Google Gemini est soumis aux conditions de Google.

L'application ne contacte **jamais Google directement** : elle ne détient aucune
clé Google. C'est notre serveur qui relaie la requête.

Si vous n'utilisez pas cette fonctionnalité, aucune photo ne quitte votre
téléphone.

### 3.2 Scan d'un code-barres

Le **numéro du code-barres** est envoyé à notre serveur, qui interroge la base
publique **Open Food Facts** et met le résultat en cache. Aucune photo n'est
transmise : la lecture du code est faite sur l'appareil, seul le numéro part.

### 3.3 Valeurs nutritionnelles d'un aliment inconnu

Si un aliment est absent de la base embarquée, **son nom** est envoyé au serveur
pour obtenir ses valeurs nutritionnelles (Google Gemini, avec un cache partagé
entre utilisateurs). Aucune donnée personnelle n'accompagne cette requête.

### 3.4 Catalogues communautaires

Les catalogues d'exercices et d'aliments sont téléchargés depuis **GitHub**
(`raw.githubusercontent.com`). Comme pour tout téléchargement, GitHub reçoit
votre adresse IP. Aucune donnée de votre part n'est envoyée.

### 3.5 Amélioration du modèle — désactivé par défaut

Un réglage **facultatif**, **désactivé par défaut**, permet de partager vos
corrections d'estimation photo pour améliorer le modèle. S'il est activé, la
**photo du plat** et vos **corrections** (aliments et quantités validés) sont
envoyées à notre serveur et **conservées** pour entraîner le modèle. Aucun
identifiant ne les accompagne. Sans ce réglage, rien de tout cela n'est envoyé,
et la photo analysée n'est pas conservée (section 3.1). Vous pouvez activer ou
désactiver ce réglage à tout moment, et demander la suppression de vos
contributions à l'adresse ci-dessous.

### 3.6 Limite quotidienne d'analyses photo

L'analyse photo est limitée à 2 repas par jour sans abonnement, et à 100 avec
l'abonnement. Pour tenir ce décompte, l'application envoie à notre serveur, avec
chaque analyse et chaque repas enregistré :

- un **identifiant technique de l'appareil** : l'identifiant Android propre à
  cette application (il ne permet pas de vous suivre d'une application à
  l'autre et n'est pas un identifiant publicitaire) ;
- votre **décalage horaire**, pour compter les repas de votre journée locale ;
- un identifiant aléatoire d'analyse, pour ne jamais compter deux fois le même
  repas.

Le serveur conserve ces décomptes **30 jours**, puis les efface. Ils ne
contiennent ni photo, ni nom d'aliment, ni aucune donnée de votre journal.

### 3.7 Abonnement

L'abonnement est **facultatif** et se souscrit dans **Google Play**. Vos
informations de paiement sont saisies chez Google : ni l'application ni nous
n'y avons accès.

Pour vérifier qu'un abonnement est actif, nous faisons appel à
**RevenueCat, Inc.** (États-Unis), sous-traitant qui reçoit de Google Play les
informations de l'achat (produit, dates, pays, statut, jeton d'achat) associées
à l'identifiant technique décrit en 3.6. RevenueCat agit pour notre compte et
n'utilise pas ces données à ses propres fins. Ce transfert hors de l'Union
européenne est encadré par les clauses contractuelles types de la Commission
européenne prévues dans l'accord de traitement de données de RevenueCat.

Si vous ne souscrivez pas, RevenueCat ne reçoit que l'identifiant technique, au
moment où l'application vérifie votre statut.

### 3.8 Journalisation technique

Comme tout serveur exposé sur Internet, notre serveur peut enregistrer des
données techniques de connexion (adresse IP, horodatage, type de requête) à des
fins de sécurité et de diagnostic. Ces journaux ne sont **jamais** utilisés pour
profiler un utilisateur, ne sont rattachés à aucun compte — il n'en existe pas —
et ne sont transmis à personne.

## 4. Permissions Android

| Permission | Utilisation |
|---|---|
| Appareil photo | photographier un plat, scanner un code-barres |
| Internet | analyse photo, code-barres, catalogues |
| Vibreur | fin du minuteur de repos |
| Notifications | minuteur de repos, notifications **locales** uniquement |
| Facturation Google Play | souscrire l'abonnement facultatif (section 3.7) |
| Health Connect (3 lectures) | voir section 2 |
| Stockage (Android 12 et antérieurs) | enregistrer un fichier de sauvegarde |

L'application ne déclare **aucune autre permission sensible** : ni microphone,
ni localisation, ni contacts, ni superposition d'écran.

## 5. Ce que l'application ne fait pas

- aucun compte, aucune inscription : seul un identifiant technique d'appareil
  sert au décompte des analyses (section 3.6) ;
- aucune publicité, aucun identifiant publicitaire ;
- aucun service d'analyse d'audience (ni Google Analytics, ni Firebase, ni Sentry) ;
- aucune revente ni partage commercial de données ;
- aucune collecte de localisation, de contacts ou de microphone.

## 6. Enfants

L'application ne s'adresse pas spécifiquement aux enfants et ne collecte
sciemment aucune donnée les concernant.

## 7. Vos droits

Vos données étant stockées sur votre appareil, vous en gardez le contrôle
direct : les effacer depuis les réglages Android ou désinstaller l'application
les supprime définitivement. Pour toute demande concernant les données
transmises au serveur (sections 3.1 à 3.7), écrivez à l'adresse ci-dessous.

## 8. Modifications

Toute évolution de cette politique sera publiée à cette même adresse, avec une
date de mise à jour.

## 9. Responsable de traitement et contact

Responsable de traitement : **Rais&Co**, éditeur de Life Sport Tracker.

Pour toute question ou demande relative à vos données :
**seirais@outlook.fr**
