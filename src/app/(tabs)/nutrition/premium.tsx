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
      onSubscribed={() => router.replace('/(tabs)/nutrition/photo' as never)}
    />
  );
}
