"""Publie les descriptions de la fiche Play depuis docs/play-store/FICHE_TEXTES.md.

Pourquoi : coller 8 textes a la main dans la Console (4 langues x courte/longue)
est la source d'erreurs la plus probable (mauvaise langue, texte tronque). L'API
Play (edits.listings) les publie en une modification relue avant envoi.

Usage :
  python scripts/play-listing.py [fiche.md] [--apply] [--backup sortie.json] [--key cle.json]
    sans --apply : affiche ce qui changerait, n'envoie rien
    --backup     : enregistre la fiche actuellement en ligne avant toute ecriture
Le titre n'est jamais modifie : seules shortDescription et fullDescription le sont.

Format attendu du fichier : une section par langue, titree
`## <Nom> (<code>)` (ex. `## Francais (fr-FR)`), contenant deux blocs de code
dans cet ordre : description courte, puis description longue.
"""
import json
import re
import sys

from google.oauth2 import service_account
from googleapiclient.discovery import build

PACKAGE = 'com.sportracker.app'
SCOPES = ['https://www.googleapis.com/auth/androidpublisher']
SHORT_MAX = 80
FULL_MAX = 4000

SECTION = re.compile(r'^## .+\(([a-z]{2}-[A-Z]{2})\)\s*$')
FENCE = re.compile(r'^```\s*$')


def parse_fiche(path: str) -> dict:
    """Renvoie {langue: {'short': ..., 'full': ...}} ; leve une erreur si un bloc manque."""
    sections: dict = {}
    lang = None
    block = None
    for line in open(path, encoding='utf-8').read().splitlines():
        if block is not None:
            if FENCE.match(line):
                sections[lang].append('\n'.join(block))
                block = None
            else:
                block.append(line)
            continue
        match = SECTION.match(line)
        if match:
            lang = match.group(1)
            sections[lang] = []
        elif lang and FENCE.match(line):
            block = []
    result = {}
    for lang, blocks in sections.items():
        if len(blocks) != 2:
            raise SystemExit(f'{lang} : {len(blocks)} bloc(s) de code, 2 attendus (courte puis longue)')
        short, full = blocks
        if len(short) > SHORT_MAX or len(full) > FULL_MAX:
            raise SystemExit(f'{lang} : trop long (courte {len(short)}/{SHORT_MAX}, longue {len(full)}/{FULL_MAX})')
        result[lang] = {'short': short, 'full': full}
    if not result:
        raise SystemExit('aucune section de langue trouvee')
    return result


def main() -> None:
    args = sys.argv[1:]
    apply = '--apply' in args
    backup = args[args.index('--backup') + 1] if '--backup' in args else None
    key_path = args[args.index('--key') + 1] if '--key' in args else 'pc-api-key.json'
    positional = [a for i, a in enumerate(args)
                  if not a.startswith('--') and (i == 0 or args[i - 1] not in ('--backup', '--key'))]
    fiche = parse_fiche(positional[0] if positional else 'docs/play-store/FICHE_TEXTES.md')

    creds = service_account.Credentials.from_service_account_file(key_path, scopes=SCOPES)
    edits = build('androidpublisher', 'v3', credentials=creds, cache_discovery=False).edits()
    edit_id = edits.insert(body={}, packageName=PACKAGE).execute()['id']

    online = {item['language']: item for item in
              edits.listings().list(editId=edit_id, packageName=PACKAGE).execute().get('listings', [])}
    if backup:
        json.dump(online, open(backup, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        print('sauvegarde :', backup)

    missing = sorted(set(fiche) - set(online))
    if missing:
        raise SystemExit(f'langue(s) absente(s) de la fiche en ligne : {missing} (a creer dans la Console)')

    for lang, texts in sorted(fiche.items()):
        current = online[lang]
        same_short = current.get('shortDescription') == texts['short']
        same_full = current.get('fullDescription') == texts['full']
        print(f"{lang}  titre « {current.get('title')} »  courte {len(texts['short'])} car."
              f"{' (identique)' if same_short else ''}  longue {len(texts['full'])} car."
              f"{' (identique)' if same_full else ''}")
        if apply:
            edits.listings().patch(editId=edit_id, packageName=PACKAGE, language=lang,
                                   body={'shortDescription': texts['short'],
                                         'fullDescription': texts['full']}).execute()

    if not apply:
        edits.delete(editId=edit_id, packageName=PACKAGE).execute()
        print('essai a blanc : rien envoye (ajouter --apply)')
        return
    edits.commit(editId=edit_id, packageName=PACKAGE).execute()
    print('COMMIT OK : descriptions envoyees a Google pour examen')


if __name__ == '__main__':
    main()
