/**
 * Régression « caméra fantôme ».
 *
 * Avant le correctif, l'écran hôte de l'analyse photo était la route
 * `(tabs)/nutrition/photo`, un écran de la pile de l'ONGLET Nutrition. Poussé
 * depuis l'accueil, « Annuler » appelait `router.back()` qui changeait d'onglet
 * (retour à l'accueil) SANS retirer `photo` de la pile Nutrition : l'écran
 * restait monté en arrière-plan, la caméra se rouvrait à l'appui suivant.
 *
 * L'écran hôte vit désormais à la RACINE (`/meal-photo`) : `router.back()`
 * dépile le Stack racine, l'écran est DÉMONTÉ et l'utilisateur retrouve l'écran
 * d'où il venait.
 *
 * Ce test échoue si l'écran hôte est replacé sous `(tabs)/nutrition` (ancienne
 * structure) : la caméra resterait montée après « Annuler ».
 */
import React from 'react';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Pressable, Text, View } from 'react-native';
import { Stack, Tabs, useRouter } from 'expo-router';

/** Écran hôte (fictif) : affiche « CAMERA » et un bouton qui appelle back(). */
function CameraHost() {
  const router = useRouter();
  return (
    <View>
      <Text>CAMERA</Text>
      <Pressable testID="camera-back" onPress={() => router.back()}>
        <Text>Annuler</Text>
      </Pressable>
    </View>
  );
}

/** Accueil (onglet) : bouton qui pousse l'écran hôte (reproduit « Analyser un
 *  plat ») et un lien vers la progression (reproduit les « pas »). */
function Home() {
  const router = useRouter();
  return (
    <View>
      <Text>ACCUEIL</Text>
      <Pressable testID="open-meal-photo" onPress={() => router.push('/meal-photo' as never)}>
        <Text>Analyser un plat</Text>
      </Pressable>
      <Pressable testID="go-progress" onPress={() => router.push('/(tabs)/progress')}>
        <Text>Voir les pas</Text>
      </Pressable>
    </View>
  );
}

function NutritionIndex() {
  return <Text>NUTRITION</Text>;
}

function ProgressIndex() {
  return <Text>PROGRESSION</Text>;
}

/** Arborescence MINIMALE et fictive reproduisant la structure réelle :
 *  Stack racine -> groupe (tabs) Tabs backBehavior="history" (index, nutrition
 *  [Stack], progress), et l'écran hôte `/meal-photo` à la RACINE. */
function buildTree() {
  return {
    _layout: () => (
      <Stack>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="meal-photo" />
      </Stack>
    ),
    '(tabs)/_layout': () => <Tabs backBehavior="history" />,
    '(tabs)/index': Home,
    '(tabs)/nutrition/_layout': () => <Stack />,
    '(tabs)/nutrition/index': NutritionIndex,
    '(tabs)/progress': ProgressIndex,
    'meal-photo': CameraHost,
  };
}

/**
 * Parcourt récursivement `state.routes[].state` et signale si une route nommée
 * EXACTEMENT 'meal-photo' OU 'photo' (l'écran hôte de l'analyse photo) est
 * encore montée quelque part. Égalité stricte (`===`), jamais de sous-chaîne.
 * Avant le correctif, l'écran hôte était la route `photo` de la pile de
 * l'onglet Nutrition : après « Annuler », `photo` y restait monté.
 */
function cameraRouteMounted(state: unknown): boolean {
  if (!state || typeof state !== 'object') return false;
  const routes = (state as { routes?: unknown }).routes;
  if (!Array.isArray(routes)) return false;
  for (const route of routes) {
    if (!route || typeof route !== 'object') continue;
    const name = (route as { name?: unknown }).name;
    if (name === 'meal-photo' || name === 'photo') return true;
    if (cameraRouteMounted((route as { state?: unknown }).state)) return true;
  }
  return false;
}

describe('Écran hôte de la photo à la racine (/meal-photo)', () => {
  it('back() depuis /meal-photo démonte la caméra et rend l’écran précédent', async () => {
    const app = renderRouter(buildTree(), { initialUrl: '/' });

    expect(screen.getByText('ACCUEIL')).toBeTruthy();
    expect(screen.queryByText('CAMERA')).toBeNull();
    expect(app.getPathname()).toBe('/');

    // Depuis l'accueil, pousse l'écran hôte (le geste « Analyser un plat »).
    fireEvent.press(screen.getByTestId('open-meal-photo'));
    await waitFor(() => expect(app.getPathname()).toBe('/meal-photo'));
    expect(screen.getByText('CAMERA')).toBeTruthy();

    // « Annuler » dépile le Stack racine : retour à l'accueil, caméra démontée.
    fireEvent.press(screen.getByTestId('camera-back'));
    await waitFor(() => expect(app.getPathname()).toBe('/'));
    expect(screen.queryByText('CAMERA')).toBeNull();
    // L'écran hôte à la racine a été DÉPILÉ (démonté), pas seulement masqué :
    // dans l'ancienne structure (écran sous `(tabs)/nutrition`), `photo` restait
    // monté après « Annuler » et la caméra ressurgissait au moindre appui.
    await waitFor(() => expect(cameraRouteMounted(app.getRouterState())).toBe(false));

    // Naviguer ensuite ailleurs ne réveille jamais la caméra fantôme.
    fireEvent.press(screen.getByTestId('go-progress'));
    await waitFor(() => expect(app.getPathname()).toBe('/progress'));
    expect(screen.queryByText('CAMERA')).toBeNull();
    await waitFor(() => expect(cameraRouteMounted(app.getRouterState())).toBe(false));
  });
});
