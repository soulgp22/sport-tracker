"""Televerse un AAB sur Google Play en mode REPRENABLE et le place sur une piste.

Pourquoi : `eas submit` renvoie l'archive d'un bloc et echoue sur cette
connexion lente (ECONNRESET apres 40 min, 2026-10-18 et 2026-10-26). L'API
Play accepte un envoi par morceaux qui reprend au dernier octet recu.

Usage :
  python scripts/play-upload.py <aab> [piste] [statut] [notes.json] [cle]
    piste  : internal (defaut) | alpha | beta | production
    statut : completed (defaut) | inProgress | draft
    notes  : {"fr-FR": "...", ...} (facultatif)
    cle    : compte de service (defaut : ./pc-api-key.json, gitignore)

Prerequis : pip install --user google-api-python-client google-auth
(lancer avec `python`, pas `python -I`). Voir connexions.md.
"""
import json
import socket
import sys
import time

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload

PACKAGE = 'com.sportracker.app'
SCOPES = ['https://www.googleapis.com/auth/androidpublisher']
CHUNK = 8 * 1024 * 1024
MAX_RETRIES = 40

socket.setdefaulttimeout(300)


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    aab = sys.argv[1]
    track = sys.argv[2] if len(sys.argv) > 2 else 'internal'
    status = sys.argv[3] if len(sys.argv) > 3 else 'completed'
    notes = json.load(open(sys.argv[4], encoding='utf-8')) if len(sys.argv) > 4 else {}
    key_path = sys.argv[5] if len(sys.argv) > 5 else 'pc-api-key.json'

    creds = service_account.Credentials.from_service_account_file(key_path, scopes=SCOPES)
    service = build('androidpublisher', 'v3', credentials=creds, cache_discovery=False)
    edits = service.edits()

    edit_id = edits.insert(body={}, packageName=PACKAGE).execute()['id']
    print('edit :', edit_id, flush=True)

    media = MediaFileUpload(aab, mimetype='application/octet-stream', resumable=True, chunksize=CHUNK)
    request = edits.bundles().upload(editId=edit_id, packageName=PACKAGE, media_body=media)

    bundle = None
    retries = 0
    started = time.time()
    while bundle is None:
        try:
            progress, bundle = request.next_chunk(num_retries=3)
            if progress:
                print(f'  {int(progress.progress() * 100):3d} %  ({int(time.time() - started)} s)', flush=True)
        except (TimeoutError, socket.timeout, ConnectionError, OSError, HttpError) as error:
            retries += 1
            if retries > MAX_RETRIES:
                raise
            print(f'  reprise {retries}/{MAX_RETRIES} : {error}', flush=True)
            time.sleep(min(60, 5 * retries))

    version_code = str(bundle['versionCode'])
    print(f'bundle televerse : versionCode {version_code} en {int(time.time() - started)} s', flush=True)

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


if __name__ == '__main__':
    main()
