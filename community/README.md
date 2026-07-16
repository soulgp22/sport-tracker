# Communauté Life Sport Tracker

Le fichier `index.json` référence les contenus téléchargeables depuis l’application.

- `programs` contient les programmes sportifs JSON.
- `foodDatabases` contient les bases d’aliments JSON ou CSV.

Chaque fichier distant est limité à 5 Mo par l’application et son nom doit rester un nom de
fichier simple, sans sous-dossier. Les bases commerciales doivent être présentées comme
communautaires et non officielles, avec une invitation à vérifier les valeurs sur l’emballage.

Pour ajouter une enseigne, créer son fichier dans ce dossier puis ajouter une entrée dans
`foodDatabases` avec un identifiant unique, le nombre d’aliments, le format et l’avertissement.
