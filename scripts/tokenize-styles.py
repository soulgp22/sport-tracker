import io, re, sys

FILES = [
 (r'src/app/(tabs)/programs/index.tsx', 3),
 (r'src/app/(tabs)/programs/new.tsx', 3),
 (r'src/app/(tabs)/programs/[id]/index.tsx', 4),
 (r'src/app/(tabs)/programs/[id]/day/[dayId].tsx', 5),
 (r'src/app/(tabs)/exercises/index.tsx', 3),
 (r'src/app/(tabs)/foods/index.tsx', 3),
 (r'src/app/(tabs)/foods/new.tsx', 3),
 (r'src/app/(tabs)/foods/[id].tsx', 3),
 (r'src/app/(tabs)/history/index.tsx', 3),
 (r'src/app/(tabs)/history/[id].tsx', 3),
 (r'src/app/(tabs)/progress/index.tsx', 3),
 (r'src/app/(tabs)/settings.tsx', 2),
 (r'src/app/(tabs)/community/index.tsx', 3),
 (r'src/app/onboarding.tsx', 2),
 (r'src/components/exercises/ExerciseCatalogList.tsx', 3),
 (r'src/components/programs/ProgramCard.tsx', 3),
 (r'src/components/foods/FoodRow.tsx', 3),
 (r'src/components/nutrition/FoodEntryRow.tsx', 3),
 (r'src/components/nutrition/MacroBar.tsx', 3),
 (r'src/components/nutrition/NutritionFacts.tsx', 3),
]

# gap/padding/margin literals -> tokens (grille 4/8)
SPACING_MAP = {
 4: 'spacing.xxs', 6: 'spacing.xs', 8: 'spacing.xs', 10: 'spacing.sm',
 12: 'spacing.sm', 14: 'spacing.md', 16: 'spacing.md', 18: 'spacing.md',
 20: 'spacing.md', 22: 'spacing.lg', 24: 'spacing.lg', 28: 'spacing.lg',
 32: 'spacing.xl', 40: 'spacing.xl', 48: 'spacing.xxl',
}
PROP_RE = re.compile(
 r'\b(padding|paddingHorizontal|paddingVertical|paddingTop|paddingBottom|paddingLeft|paddingRight'
 r'|margin|marginHorizontal|marginVertical|marginTop|marginBottom|marginLeft|marginRight'
 r'|gap|rowGap|columnGap): (\d+),')

SHADOW_RE = re.compile(
 r'[ \t]*shadowColor: c\.overlay,\n'
 r'[ \t]*shadowOpacity: [0-9.]+,\n'
 r'[ \t]*shadowRadius: [0-9.]+,\n'
 r'([ \t]*shadowOffset: \{[^}]*\},\n)?'
 r'[ \t]*elevation: [0-9.]+,\n')

RADIUS_MAP = {12: 'radius.lg', 18: 'radius.pill', 14: 'radius.md', 10: 'radius.sm', 8: 'radius.sm', 16: 'radius.md', 20: 'radius.lg', 22: 'radius.xl', 28: 'radius.xl', 13: 'radius.md', 17: 'radius.lg', 15: 'radius.md', 11: 'radius.sm', 9: 'radius.sm'}
RADIUS_RE = re.compile(r'\bborderRadius: (\d+),')

def spacing_sub(m):
    v = int(m.group(2))
    if v in SPACING_MAP:
        return f'{m.group(1)}: {SPACING_MAP[v]},'
    return m.group(0)

def radius_sub(m):
    v = int(m.group(1))
    if v in RADIUS_MAP:
        return f'borderRadius: {RADIUS_MAP[v]},'
    return m.group(0)

total_changes = {}
for path, depth in FILES:
    s = io.open(path, encoding='utf-8').read()
    orig = s
    n_shadow = len(SHADOW_RE.findall(s))
    s = SHADOW_RE.sub(lambda m: ' ' * (len(m.group(0)) - len(m.group(0).lstrip())) + '...cardShadow(c),\n', s)
    s = PROP_RE.sub(spacing_sub, s)
    s = RADIUS_RE.sub(radius_sub, s)
    if s == orig:
        print('skip (aucun changement):', path)
        continue
    # import tokens si utilisés
    needs = set()
    if 'cardShadow(c)' in s: needs.add('cardShadow')
    if 'radius.' in s: needs.add('radius')
    if 'spacing.' in s: needs.add('spacing')
    if 'theme/tokens' not in s:
        rel = '../' * depth + 'theme/tokens'
        anchor = re.search(r"import \{ fonts \} from '([^']*theme/fonts)';", s)
        imp = f"import {{ {', '.join(sorted(needs))} }} from '{rel}';\n"
        if anchor:
            s = s[:anchor.end()] + '\n' + imp + s[anchor.end():]
        else:
            # insérer après le dernier import du bloc d'en-tête
            last = None
            for m in re.finditer(r"^import .*;\n", s, re.M):
                last = m
            assert last, path
            s = s[:last.end()] + imp + s[last.end():]
    io.open(path, 'w', encoding='utf-8', newline='\n').write(s)
    total_changes[path] = n_shadow

for p, n in total_changes.items():
    print(f'ok {p} (ombres remplacées: {n})')
print('fichiers modifiés:', len(total_changes))
