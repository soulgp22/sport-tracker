import { useLocalSearchParams, useRouter } from 'expo-router';

import { Paywall } from '../../../components/subscription/Paywall';

/**
 * Route de l'ecran d'abonnement. `reason=quota` quand on y arrive par la
 * limite gratuite (l'ecran explique alors pourquoi il s'affiche).
 */
export default function PremiumScreen() {
  const router = useRouter();
  const { reason } = useLocalSearchParams<{ reason?: string }>();

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/nutrition' as never);
  };

  return (
    <Paywall
      reason={reason === 'quota' ? 'quota' : 'settings'}
      onClose={close}
      onSubscribed={() => {
        // Après l'achat, la limite gratuite tombe : on quitte l'écran premium
        // (dépile vers l'écran d'origine) puis on ouvre l'analyse à la racine,
        // sans laisser l'écran premium monté en dessous.
        router.back();
        router.push('/meal-photo' as never);
      }}
    />
  );
}
