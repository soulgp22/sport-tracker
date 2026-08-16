import { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';
import type { ReactNode } from 'react';

interface AnimatedNumberProps {
  /** Valeur finale à atteindre. */
  value: number;
  /** Durée de la montée en ms. 0 = pas d'animation, rendu immédiat. */
  duration?: number;
  /** Mise en forme du nombre affiché (séparateurs, décimales). */
  format: (value: number) => string;
  style?: StyleProp<TextStyle>;
  testID?: string;
  /** Suffixe rendu après le nombre (ex. « kg »). */
  children?: ReactNode;
}

/** Pas d'une image d'animation (≈ 60 fps). */
const FRAME_MS = 1000 / 60;

/** Courbe d'accélération douce : démarre et finit en douceur. */
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Compteur qui fait monter un nombre depuis 0 jusqu'à sa valeur finale.
 *
 * L'animation est pilotée par une boucle de `setTimeout` (image par image,
 * ≈ 60 fps) plutôt que par `Animated.timing` : le `requestAnimationFrame` de
 * l'environnement Jest est moqué en `setTimeout(…, 0)`, ce qui empêche
 * l'horloge d'avancer sous faux minuteurs. Une boucle à pas fixe est donc
 * déterministe et testable avec `jest.advanceTimersByTime`.
 */
export function AnimatedNumber({
  value,
  duration = 0,
  format,
  style,
  testID,
  children,
}: AnimatedNumberProps) {
  const [displayed, setDisplayed] = useState<number>(0);
  const displayedRef = useRef<number>(0);

  useEffect(() => {
    // Rendu immédiat sans aucun timer : le rendu ci-dessous utilise
    // directement `value`, il n'y a donc rien à synchroniser ici.
    if (duration <= 0) {
      return;
    }

    // Repart de la valeur actuellement AFFICHÉE (jamais de 0) : un changement
    // de poids ne fait pas retomber le chiffre à zéro sous les yeux.
    const from = displayedRef.current;
    const startTime = Date.now();
    let timerId: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const tick = () => {
      if (stopped) return;

      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);

      if (progress >= 1) {
        // Dernière image exacte, jamais une approximation à 0,01 près.
        displayedRef.current = value;
        setDisplayed(value);
        return;
      }

      const next = from + easeInOut(progress) * (value - from);
      displayedRef.current = next;
      setDisplayed(next);
      timerId = setTimeout(tick, FRAME_MS);
    };

    timerId = setTimeout(tick, FRAME_MS);

    return () => {
      stopped = true;
      if (timerId !== null) clearTimeout(timerId);
    };
  }, [value, duration]);

  const shown = duration <= 0 ? value : displayed;
  const text = format(shown);
  const content = children === undefined || children === null ? text : [text, children];

  return (
    <Text style={style} testID={testID}>
      {content}
    </Text>
  );
}
