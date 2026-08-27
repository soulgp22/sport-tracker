> ## ⚠️ À COMPLÉTER AVANT PUBLICATION
>
> Deux points restent ouverts, marqués `⟨À CONFIRMER : …⟩` dans le texte :
>
> 1. **Le pays du centre de données** qui héberge le serveur (section 3).
>    Ce n'est pas un détail : si le serveur est hors Union européenne, le RGPD
>    impose de le dire et d'indiquer le cadre du transfert.
> 2. **Le responsable de traitement** à afficher (section 9).
>
> Réglé le 27 août 2026, sur confirmation de l'éditeur : les photos de repas ne
> sont **pas conservées** après analyse. La journalisation technique du serveur
> (section 3.6) est décrite au conditionnel faute de vérification du Caddyfile —
> une formulation qui reste vraie que le serveur journalise ou non ; à resserrer
> si la configuration est vérifiée.
>
> **Constat séparé, à traiter par un correctif et non par ce texte** : le
> manifeste déclare `RECORD_AUDIO` (microphone) et `SYSTEM_ALERT_WINDOW`
> (superposition d'écran), qu'aucune ligne du code applicatif n'utilise. Elles
> proviennent de dépendances. Les déclarer sans s'en servir est un risque de
> refus Play et alourdit inutilement cette politique : mieux vaut les retirer du
> manifeste.
>
> *(Supprimer entièrement ce bloc avant de publier la page.)*

---

# Politique de confidentialité — Life Sport Tracker

*Dernière mise à jour : 27 août 2026*

## Résumé

Life Sport Tracker fonctionne **sans compte** et stocke l'essentiel de vos
données **sur votre appareil**. Trois fonctionnalités font exception et
nécessitent une connexion à un serveur : l'**analyse photo d'un repas**, le
**scan d'un code-barres**, et le **téléchargement de catalogues**. Elles sont
détaillées ci-dessous.

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

Le serveur d'analyse est **opéré par l'éditeur de l'application**, hébergé sur
un serveur privé loué auprès d'un hébergeur professionnel
⟨À CONFIRMER : pays du centre de données⟩, et joint en HTTPS.

### 3.1 Analyse photo d'un repas

Quand vous demandez l'analyse d'une photo de plat, **l'image est envoyée** à ce
serveur, qui la transmet à **Google Gemini** pour reconnaissance des aliments.
Le résultat (noms d'aliments et quantités estimées) revient à l'application.

- L'image n'est envoyée **que** lorsque vous déclenchez explicitement l'analyse.
- **Elle n'est pas conservée** sur notre serveur : elle est transmise pour
  analyse, puis écartée. Aucun historique de photos n'est constitué.
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
corrections d'estimation photo pour améliorer le modèle. S'il est activé, seul
le **texte** de la correction est transmis — **jamais la photo**. Vous pouvez le
réactiver ou le désactiver à tout moment dans les réglages.

### 3.6 Journalisation technique

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
| Health Connect (3 lectures) | voir section 2 |
| Stockage (Android 12 et antérieurs) | enregistrer un fichier de sauvegarde |

L'application déclare également, **du fait de bibliothèques tierces**, les
permissions microphone et superposition d'écran : elle ne s'en sert pas, ne
demande jamais leur activation, et n'enregistre aucun son.

## 5. Ce que l'application ne fait pas

- aucun compte, aucune inscription, aucune identification ;
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
transmises au serveur (sections 3.1 à 3.5), écrivez à l'adresse ci-dessous.

## 8. Modifications

Toute évolution de cette politique sera publiée à cette même adresse, avec une
date de mise à jour.

## 9. Contact

**seirais@outlook.fr**

⟨À CONFIRMER : responsable de traitement à afficher⟩
