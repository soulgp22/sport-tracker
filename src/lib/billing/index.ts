/**
 * Point d'acces unique a la facturation. Changer de fournisseur (retour vers
 * Google Play Billing en direct) = changer cette ligne et ecrire l'adaptateur.
 */
import { createRevenueCatProvider } from './revenueCat';
import type { BillingProvider } from './types';

export const billing: BillingProvider = createRevenueCatProvider();

export * from './types';
export * from './plans';
