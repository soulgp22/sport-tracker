/**
 * Demande d'avis Google Play : 1re demande a la 3e seance terminee, puis au
 * plus une fois tous les 120 jours ; ne leve jamais.
 */
import * as StoreReview from 'expo-store-review';

import {
  REVIEW_FIRST_AT_SESSIONS,
  REVIEW_MIN_INTERVAL_DAYS,
  shouldRequestReview,
} from '../reviewPrompt';
import { maybeRequestStoreReview } from '../storeReview';
import { useReviewPromptStore } from '../../store/reviewPromptStore';

jest.mock('expo-store-review', () => ({
  isAvailableAsync: jest.fn(),
  requestReview: jest.fn(),
}));

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-10-18T12:00:00.000Z');
const daysBefore = (days: number) => new Date(NOW.getTime() - days * DAY).toISOString();

describe('shouldRequestReview', () => {
  it('ne demande rien avant la 3e seance terminee', () => {
    expect(REVIEW_FIRST_AT_SESSIONS).toBe(3);
    expect(shouldRequestReview(0, { lastRequestedAt: null }, NOW)).toBe(false);
    expect(shouldRequestReview(2, { lastRequestedAt: null }, NOW)).toBe(false);
  });

  it('demande a la 3e seance, et apres si jamais demande', () => {
    expect(shouldRequestReview(3, { lastRequestedAt: null }, NOW)).toBe(true);
    expect(shouldRequestReview(12, { lastRequestedAt: null }, NOW)).toBe(true);
  });

  it('ne redemande pas avant 120 jours, redemande ensuite', () => {
    expect(REVIEW_MIN_INTERVAL_DAYS).toBe(120);
    expect(shouldRequestReview(10, { lastRequestedAt: daysBefore(1) }, NOW)).toBe(false);
    expect(shouldRequestReview(10, { lastRequestedAt: daysBefore(119) }, NOW)).toBe(false);
    expect(shouldRequestReview(10, { lastRequestedAt: daysBefore(120) }, NOW)).toBe(true);
  });

  it('une date illisible ne bloque pas la demande pour toujours', () => {
    expect(shouldRequestReview(3, { lastRequestedAt: 'pas-une-date' }, NOW)).toBe(true);
  });
});

describe('maybeRequestStoreReview', () => {
  const isAvailable = StoreReview.isAvailableAsync as jest.Mock;
  const requestReview = StoreReview.requestReview as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    isAvailable.mockResolvedValue(true);
    requestReview.mockResolvedValue(undefined);
    useReviewPromptStore.setState({ lastRequestedAt: null, requestCount: 0 });
  });

  it('sollicite la fenetre Google a la 3e seance et memorise la demande', async () => {
    await expect(maybeRequestStoreReview(3, NOW)).resolves.toBe(true);
    expect(requestReview).toHaveBeenCalledTimes(1);
    expect(useReviewPromptStore.getState()).toMatchObject({
      lastRequestedAt: NOW.toISOString(),
      requestCount: 1,
    });
  });

  it('ne sollicite rien a la 2e seance', async () => {
    await expect(maybeRequestStoreReview(2, NOW)).resolves.toBe(false);
    expect(requestReview).not.toHaveBeenCalled();
    expect(useReviewPromptStore.getState().lastRequestedAt).toBeNull();
  });

  it('ne redemande pas a la seance suivante', async () => {
    await maybeRequestStoreReview(3, NOW);
    await maybeRequestStoreReview(4, new Date(NOW.getTime() + DAY));
    expect(requestReview).toHaveBeenCalledTimes(1);
  });

  it('ne memorise rien quand la fenetre est indisponible', async () => {
    isAvailable.mockResolvedValue(false);
    await expect(maybeRequestStoreReview(3, NOW)).resolves.toBe(false);
    expect(requestReview).not.toHaveBeenCalled();
    expect(useReviewPromptStore.getState().requestCount).toBe(0);
  });

  it('un echec de Google ne leve pas et laisse reessayer plus tard', async () => {
    requestReview.mockRejectedValue(new Error('ERR_STORE_REVIEW_FAILED'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await expect(maybeRequestStoreReview(3, NOW)).resolves.toBe(false);
    expect(useReviewPromptStore.getState().lastRequestedAt).toBeNull();
    warn.mockRestore();
  });

  it('attend que le stockage soit lu avant de decider', async () => {
    const hydrated = jest.spyOn(useReviewPromptStore.persist, 'hasHydrated').mockReturnValue(false);
    await expect(maybeRequestStoreReview(3, NOW)).resolves.toBe(false);
    expect(requestReview).not.toHaveBeenCalled();
    hydrated.mockRestore();
  });
});
