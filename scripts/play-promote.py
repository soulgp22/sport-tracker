"""Promeut un versionCode DEJA televerse sur Google Play (piste interne) vers
une autre piste, sans renvoyer l'AAB : l'edition Play reference le bundle
existant. Evite les 45 a 60 minutes de televersement d'`eas submit` sur la
connexion lente (voir connexions.md).

Usage :
  python scripts/play-promote.py <versionCode> <notes.json> [piste] [statut] [cle]
    piste  : production (defaut) | alpha | beta | internal
    statut : completed (defaut) | inProgress | halted | draft
    cle    : chemin du compte de service (defaut : ./pc-api-key.json, gitignore)
  notes.json : {"fr-FR": "...", "en-US": "...", "es-ES": "...", "de-DE": "..."}

Prerequis : pip install --user google-api-python-client google-auth
(lancer avec `python`, pas `python -I` : le mode isole ignore le site utilisateur).
Refuse de promouvoir un versionCode absent des bundles deja televerses.
"""
import json
import sys

from google.oauth2 import service_account
from googleapiclient.discovery import build

PACKAGE = 'com.sportracker.app'
SCOPES = ['https://www.googleapis.com/auth/androidpublisher']


def main() -> None:
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    version_code = sys.argv[1]
    with open(sys.argv[2], encoding='utf-8') as handle:
        notes = json.load(handle)
    track = sys.argv[3] if len(sys.argv) > 3 else 'production'
    status = sys.argv[4] if len(sys.argv) > 4 else 'completed'
    key_path = sys.argv[5] if len(sys.argv) > 5 else 'pc-api-key.json'

    creds = service_account.Credentials.from_service_account_file(key_path, scopes=SCOPES)
    service = build('androidpublisher', 'v3', credentials=creds, cache_discovery=False)
    edits = service.edits()

    edit_id = edits.insert(body={}, packageName=PACKAGE).execute()['id']
    bundles = edits.bundles().list(editId=edit_id, packageName=PACKAGE).execute().get('bundles', [])
    codes = [str(bundle['versionCode']) for bundle in bundles]
    print('bundles televerses :', codes, flush=True)
    if version_code not in codes:
        raise SystemExit(f'versionCode {version_code} absent des bundles televerses : rien promu.')

    before = edits.tracks().get(editId=edit_id, packageName=PACKAGE, track=track).execute()
    print(f'{track} avant :', json.dumps(before.get('releases', []), ensure_ascii=False), flush=True)

    body = {
        'track': track,
        'releases': [{
            'versionCodes': [version_code],
            'status': status,
            'releaseNotes': [{'language': lang, 'text': text} for lang, text in notes.items()],
        }],
    }
    edits.tracks().update(editId=edit_id, packageName=PACKAGE, track=track, body=body).execute()
    edits.commit(editId=edit_id, packageName=PACKAGE).execute()
    print(f'COMMIT OK : versionCode {version_code} sur {track} ({status})', flush=True)

    check = edits.insert(body={}, packageName=PACKAGE).execute()['id']
    after = edits.tracks().get(editId=check, packageName=PACKAGE, track=track).execute()
    print(f'{track} apres :', json.dumps(after.get('releases', []), ensure_ascii=False), flush=True)
    edits.delete(editId=check, packageName=PACKAGE).execute()


if __name__ == '__main__':
    main()
