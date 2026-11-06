# Textes de la fiche Play Store — version du 2026-11-06 (app 1.40.0, Platelift)

> À coller dans Play Console → Présence sur le Store → Fiche principale
> (une traduction par langue). La version précédente (2026-10-18, app 1.37.0,
> axe « photo et Premium d'abord ») est dans l'historique git de ce fichier.
>
> **Axe** : ce qui distingue l'app de ses concurrents, d'après le brief
> concurrentiel du 2026-11-05. Chez Cal AI, MyFitnessPal, Yazio et Foodvisor,
> la photo IA est payante ; chez Hevy, Strong et Fitbod, il n'y a pas de
> nutrition ; le premier motif de notes 1★ du secteur est le paiement découvert
> après l'inscription. La fiche ouvre donc sur trois faits : **2 analyses photo
> offertes par jour, musculation entièrement gratuite, aucun compte**. Premium
> passe après ce qui est gratuit. Mots-clés français conservés en introduction
> et en titres : « compteur de calories photo », « programme musculation »,
> « suivi musculation ».
>
> **Chaque affirmation est vérifiée dans le code de la 1.39.4** (2026-11-05) :
> - 2 analyses gratuites et 100 en Premium (`lib/mealPhotoQuota.ts`) ;
> - Premium ne débloque que l'analyse photo : aucune autre fonction ne lit
>   l'abonnement (`useMealPhotoQuota`, `Paywall`, Paramètres) ;
> - aucune limite de programmes ni de séances (`programStore`, `sessionStore`) ;
> - 873 exercices au catalogue (`data/exercises.catalog.json`) ;
> - aucun SDK publicitaire (`package.json`) ;
> - génération de programme par une IA externe puis import JSON (Paramètres) ;
> - objectifs du jour pas / séances par semaine / calories actives et deux
>   widgets, bandeau 4×1 et carte 2×2 (`app.json`, `dailyGoals`) ;
> - Health Connect = pas et calories, statut et réinitialisation dans
>   Paramètres ; le widget ne se met à jour qu'à l'ouverture de l'app (lecture
>   en arrière-plan retirée en vc 61), donc **aucune promesse de mise à jour
>   automatique** ;
> - sauvegarde exportable en fichier (`lib/profileBackup.ts`) ;
> - photos non conservées sauf option, désactivée par défaut
>   (`aiTrainingOptInStore`).
>
> **Aucun prix dans le texte** : il varie selon le pays et Google l'affiche
> déjà. Aucune promesse de perte de poids ni de précision. Aucun nom de marque
> tierce (ChatGPT, Claude, concurrents) : la règle Play sur les métadonnées
> l'interdit hors compatibilité stricte.
>
> **Limites Play** : description courte 80 caractères, description longue
> 4 000 caractères. Les longueurs sont indiquées sous chaque titre.
>
> **Publication** : par l'API le 2026-11-05 avec `scripts/play-listing.py
> --apply`, qui lit directement ce fichier (garder le format des sections et
> des blocs de code).
>
> **Titre** : `Platelift` suivi des deux piliers de l'app dans chaque langue
> (nom choisi le 2026-11-06 ; ancien titre « Life Sport Tracker », tronqué en
> « Life Sport Tracke » en allemand et en espagnol).
>
> **Captures** : inchangées (`screenshots/fr/`, analyse photo en première
> position).

---

## Français (fr-FR)

**Titre** (28 car.)

```
Platelift : calories & muscu
```

**Description courte** (77 car.)

```
Calories en photo (2 offertes par jour) et musculation gratuite, sans compte.
```

**Description longue**

```
Prends ton assiette en photo pour connaître ses calories, et suis ta musculation séance après séance. Un compteur de calories photo et un suivi musculation complet, dans une seule app : la musculation est entièrement gratuite, l'analyse photo est offerte 2 fois par jour, et tu n'as aucun compte à créer.

CE QUI EST GRATUIT
• Séances, programmes, exercices, minuteur, journal alimentaire et statistiques, sans limite
• 2 analyses photo de repas chaque jour
• Pas de compte, pas de publicité

COMPTEUR DE CALORIES PHOTO
• Photographie ton plat, ou importe une photo de ta galerie
• L'IA détecte chaque aliment et estime sa portion, ses calories, ses protéines, glucides et lipides
• Ajuste les grammes, retire ou ajoute un aliment, puis ajoute le repas à ta journée
• C'est une estimation : tu gardes la main sur chaque quantité

PROGRAMME MUSCULATION
• Programmes prêts à l'emploi ou créés par toi, organisés en séances
• 873 exercices illustrés, avec muscle ciblé et matériel
• Génère un programme avec l'assistant IA de ton choix, puis importe-le
• Séance guidée : note tes séries, remplace un exercice en un geste
• Minuteur de repos plein écran : ajoute ou retire 15 s, ou passe

SUIVI MUSCULATION ET STATS
• Charge, volume et historique pour chaque exercice
• 1RM estimé et niveau de force comparé au référentiel OpenIPF
• Régularité : semaines de suite, séances de la semaine et du mois
• Poids corporel, dépense et pas au jour le jour dans l'onglet Stats

OBJECTIFS DU JOUR
• Trois anneaux sur l'accueil : pas, séances de la semaine et calories actives
• Deux widgets Android : un bandeau ou une carte, au choix

NUTRITION
• Recherche d'aliments et scan de code-barres (Open Food Facts)
• Repas regroupés comme tu veux, objectifs de calories et de macros
• Bilan du jour : consommé, dépense estimée, calories restantes

SANTÉ
• Synchronisation Health Connect : pas et calories dépensées
• Statut de la connexion et réinitialisation dans les Paramètres

PREMIUM
• Jusqu'à 100 analyses photo par jour
• Abonnement mensuel ou annuel, résiliable à tout moment dans Google Play
• Premium ne concerne que l'analyse photo : tout le reste reste gratuit

TES DONNÉES
• Tes séances et ton journal restent sur ton téléphone
• Sauvegarde complète exportable en fichier, et restauration sur un autre téléphone
• Les photos envoyées pour analyse ne sont pas conservées, sauf si tu actives l'option d'amélioration de l'IA (désactivée par défaut)

Disponible en français, anglais, espagnol et allemand.
```

---

## English (en-US)

**Title** (29 chars)

```
Platelift: Calories & Gym Log
```

**Short description** (76 chars)

```
Photo calorie counter (2 free scans a day) and free gym tracker, no account.
```

**Full description**

```
Snap your plate to see its calories, and track your training session after session. A photo calorie counter and a complete gym tracker in one app: strength training is completely free, photo analysis is free twice a day, and there is no account to create.

WHAT'S FREE
• Workouts, programs, exercises, rest timer, food log and stats, with no limits
• 2 meal photo analyses every day
• No account, no ads

PHOTO CALORIE COUNTER
• Photograph your meal, or import a photo from your gallery
• The AI detects each food and estimates its portion, calories, protein, carbs and fat
• Adjust the grams, remove or add a food, then add the meal to your day
• It is an estimate: you stay in control of every quantity

WORKOUT PROGRAMS
• Ready-made programs or your own, organised into workouts
• 873 illustrated exercises, with target muscle and equipment
• Generate a program with the AI assistant of your choice, then import it
• Guided workouts: log your sets, swap an exercise in one tap
• Full-screen rest timer: add or remove 15 s, or skip

GYM TRACKER AND STATS
• Load, volume and history for every exercise
• Estimated 1RM and strength level compared with the OpenIPF reference
• Consistency: week streak, workouts this week and this month
• Body weight, calories burned and steps day by day in the Stats tab

DAILY GOALS
• Three rings on the home screen: steps, workouts this week and active calories
• Two Android widgets: a strip or a card, your choice

NUTRITION
• Food search and barcode scanning (Open Food Facts)
• Group meals your way, set calorie and macro goals
• Daily summary: eaten, estimated burn, calories left

HEALTH
• Health Connect sync: steps and calories burned
• Connection status and reset in Settings

PREMIUM
• Up to 100 photo analyses per day
• Monthly or annual subscription, cancel anytime in Google Play
• Premium only covers photo analysis: everything else stays free

YOUR DATA
• Your workouts and food log stay on your phone
• Full backup you can export to a file and restore on another phone
• Photos sent for analysis are not kept, unless you turn on the AI improvement option (off by default)

Available in English, French, Spanish and German.
```

---

## Español (es-ES)

**Título** (25 car.)

```
Platelift: calorías y gym
```

**Descripción breve** (78 car.)

```
Calorías por foto (2 gratis al día) y registro de gimnasio gratis, sin cuenta.
```

**Descripción completa**

```
Fotografía tu plato para conocer sus calorías y registra tu entrenamiento sesión tras sesión. Un contador de calorías por foto y un registro de gimnasio completo en una sola app: el entrenamiento de fuerza es totalmente gratis, el análisis por foto es gratis 2 veces al día y no tienes que crear ninguna cuenta.

LO QUE ES GRATIS
• Sesiones, programas, ejercicios, temporizador, diario de comidas y estadísticas, sin límites
• 2 análisis por foto de comidas cada día
• Sin cuenta y sin publicidad

CONTADOR DE CALORÍAS POR FOTO
• Fotografía tu comida o importa una foto de tu galería
• La IA detecta cada alimento y estima su ración, sus calorías, proteínas, hidratos y grasas
• Ajusta los gramos, quita o añade un alimento y añade la comida a tu día
• Es una estimación: tú decides cada cantidad

RUTINAS DE GIMNASIO
• Programas listos para usar o creados por ti, organizados en sesiones
• 873 ejercicios ilustrados, con músculo trabajado y material
• Genera un programa con el asistente de IA que prefieras e impórtalo
• Sesión guiada: registra tus series y cambia un ejercicio con un toque
• Temporizador de descanso a pantalla completa: suma o resta 15 s, o sáltalo

PROGRESO Y ESTADÍSTICAS
• Carga, volumen e historial de cada ejercicio
• 1RM estimado y nivel de fuerza comparado con la referencia OpenIPF
• Constancia: semanas seguidas, sesiones de la semana y del mes
• Peso corporal, gasto y pasos día a día en la pestaña Estadísticas

OBJETIVOS DEL DÍA
• Tres anillos en la pantalla de inicio: pasos, sesiones de la semana y calorías activas
• Dos widgets de Android: una franja o una tarjeta, a tu elección

NUTRICIÓN
• Búsqueda de alimentos y escaneo de códigos de barras (Open Food Facts)
• Agrupa tus comidas a tu manera, objetivos de calorías y macros
• Balance del día: consumido, gasto estimado, calorías restantes

SALUD
• Sincronización con Health Connect: pasos y calorías quemadas
• Estado de la conexión y restablecimiento en Ajustes

PREMIUM
• Hasta 100 análisis por foto al día
• Suscripción mensual o anual, cancelable en cualquier momento en Google Play
• Premium solo afecta al análisis por foto: todo lo demás sigue siendo gratis

TUS DATOS
• Tus sesiones y tu diario se quedan en tu teléfono
• Copia de seguridad completa exportable a un archivo y restaurable en otro teléfono
• Las fotos enviadas para análisis no se conservan, salvo si activas la opción de mejora de la IA (desactivada por defecto)

Disponible en español, inglés, francés y alemán.
```

---

## Deutsch (de-DE)

**Titel** (30 Zeichen)

```
Platelift: Kalorien & Training
```

**Kurzbeschreibung** (79 Zeichen)

```
Kalorien per Foto (2 gratis pro Tag) und kostenloses Krafttraining, ohne Konto.
```

**Vollständige Beschreibung**

```
Fotografiere deinen Teller, um seine Kalorien zu sehen, und erfasse dein Training Einheit für Einheit. Ein Kalorienzähler per Foto und ein vollständiges Trainingstagebuch in einer App: Krafttraining ist komplett kostenlos, die Fotoanalyse ist zweimal pro Tag gratis, und du musst kein Konto anlegen.

WAS KOSTENLOS IST
• Training, Pläne, Übungen, Pausentimer, Ernährungstagebuch und Statistik, ohne Limit
• 2 Fotoanalysen von Mahlzeiten pro Tag
• Kein Konto, keine Werbung

KALORIENZÄHLER PER FOTO
• Fotografiere dein Essen oder importiere ein Foto aus deiner Galerie
• Die KI erkennt jedes Lebensmittel und schätzt Portion, Kalorien, Eiweiß, Kohlenhydrate und Fett
• Gramm anpassen, Lebensmittel entfernen oder hinzufügen, dann die Mahlzeit deinem Tag hinzufügen
• Es ist eine Schätzung: Jede Menge bestimmst du selbst

TRAININGSPLÄNE
• Fertige Trainingspläne oder deine eigenen, in Einheiten gegliedert
• 873 bebilderte Übungen mit Zielmuskel und Equipment
• Erstelle einen Plan mit dem KI-Assistenten deiner Wahl und importiere ihn
• Geführtes Training: Sätze erfassen, Übung mit einem Tipp tauschen
• Pausentimer im Vollbild: 15 s hinzufügen, abziehen oder überspringen

FORTSCHRITT UND STATISTIK
• Gewicht, Volumen und Verlauf für jede Übung
• Geschätztes 1RM und Kraftlevel im Vergleich zur OpenIPF-Referenz
• Regelmäßigkeit: Wochen in Folge, Einheiten pro Woche und Monat
• Körpergewicht, Verbrauch und Schritte Tag für Tag im Tab „Statistik“

TAGESZIELE
• Drei Ringe auf dem Startbildschirm: Schritte, Einheiten der Woche und aktive Kalorien
• Zwei Android-Widgets: als Leiste oder als Karte, ganz wie du willst

ERNÄHRUNG
• Lebensmittelsuche und Barcode-Scan (Open Food Facts)
• Mahlzeiten frei gruppieren, Kalorien- und Makroziele
• Tagesbilanz: gegessen, geschätzter Verbrauch, verbleibende Kalorien

GESUNDHEIT
• Health-Connect-Synchronisierung: Schritte und verbrannte Kalorien
• Verbindungsstatus und Zurücksetzen in den Einstellungen

PREMIUM
• Bis zu 100 Fotoanalysen pro Tag
• Monats- oder Jahresabo, jederzeit in Google Play kündbar
• Premium betrifft nur die Fotoanalyse: Alles andere bleibt kostenlos

DEINE DATEN
• Deine Workouts und dein Ernährungstagebuch bleiben auf deinem Handy
• Vollständige Sicherung als Datei exportierbar und auf einem anderen Handy wiederherstellbar
• Zur Analyse gesendete Fotos werden nicht gespeichert, außer du aktivierst die Option zur KI-Verbesserung (standardmäßig aus)

Verfügbar auf Deutsch, Englisch, Französisch und Spanisch.
```
