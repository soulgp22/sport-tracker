"""Remplace l'image de presentation (feature graphic) de la fiche Play, langue par langue.

Pourquoi : dans la Console, chaque langue se change a la main. Le 2026-11-07, la
fiche anglaise affichait la banniere FRANCAISE : erreur d'import invisible tant
qu'on ne compare pas les empreintes. L'API (edits.images) envoie un dossier
d'images nommees par langue et affiche l'empreinte de ce qui est en ligne.

Usage :
  python scripts/play-images.py [dossier] [--apply] [--key cle.json]
    dossier : contient <langue>.png (ex. fr-FR.png), 1024 x 500, par defaut
              docs/play-store/assets/feature
    sans --apply : compare les empreintes en ligne et locales, n'envoie rien
"""
import hashlib
import sys
from pathlib import Path

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from PIL import Image

PACKAGE = 'com.sportracker.app'
SCOPES = ['https://www.googleapis.com/auth/androidpublisher']
IMAGE_TYPE = 'featureGraphic'
SIZE = (1024, 500)
MAX_BYTES = 1024 * 1024


def main() -> None:
    args = sys.argv[1:]
    apply = '--apply' in args
    key_path = args[args.index('--key') + 1] if '--key' in args else 'pc-api-key.json'
    positional = [a for i, a in enumerate(args)
                  if not a.startswith('--') and (i == 0 or args[i - 1] != '--key')]
    folder = Path(positional[0] if positional else 'docs/play-store/assets/feature')

    local = {}
    for path in sorted(folder.glob('*.png')):
        with Image.open(path) as im:
            if im.size != SIZE or im.mode != 'RGB' or path.stat().st_size > MAX_BYTES:
                raise SystemExit(f'{path} : {im.size} {im.mode} {path.stat().st_size} o '
                                 f'(attendu {SIZE}, RGB sans transparence, <= 1 Mo)')
        local[path.stem] = (path, hashlib.sha256(path.read_bytes()).hexdigest())
    if not local:
        raise SystemExit(f'aucun <langue>.png dans {folder}')

    creds = service_account.Credentials.from_service_account_file(key_path, scopes=SCOPES)
    edits = build('androidpublisher', 'v3', credentials=creds, cache_discovery=False).edits()
    edit_id = edits.insert(body={}, packageName=PACKAGE).execute()['id']
    languages = {item['language'] for item in
                 edits.listings().list(editId=edit_id, packageName=PACKAGE).execute().get('listings', [])}
    unknown = sorted(set(local) - languages)
    if unknown:
        edits.delete(editId=edit_id, packageName=PACKAGE).execute()
        raise SystemExit(f'fichier(s) sans langue sur la fiche : {unknown} (en ligne : {sorted(languages)})')

    changed = 0
    for lang, (path, digest) in local.items():
        online = edits.images().list(editId=edit_id, packageName=PACKAGE, language=lang,
                                     imageType=IMAGE_TYPE).execute().get('images', [])
        online_digests = [img.get('sha256', '') for img in online]
        same = online_digests == [digest]
        print(f"{lang}  en ligne {[d[:10] for d in online_digests]}  local {digest[:10]}"
              f"{'  (identique)' if same else ''}")
        if apply and not same:
            edits.images().deleteall(editId=edit_id, packageName=PACKAGE, language=lang,
                                     imageType=IMAGE_TYPE).execute()
            edits.images().upload(editId=edit_id, packageName=PACKAGE, language=lang, imageType=IMAGE_TYPE,
                                  media_body=MediaFileUpload(str(path), mimetype='image/png')).execute()
            changed += 1

    if not apply or not changed:
        edits.delete(editId=edit_id, packageName=PACKAGE).execute()
        print('rien envoye' + ('' if apply else ' (essai a blanc, ajouter --apply)'))
        return
    edits.commit(editId=edit_id, packageName=PACKAGE).execute()
    print(f'COMMIT OK : {changed} image(s) de presentation envoyee(s) a Google pour examen')


if __name__ == '__main__':
    main()
