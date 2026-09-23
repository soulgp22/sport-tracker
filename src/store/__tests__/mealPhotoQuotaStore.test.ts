/**
 * Declarations de repas au serveur : un repas enregistre hors ligne doit etre
 * declare plus tard, sinon le serveur rendrait des analyses gratuites.
 */
import { useMealPhotoQuotaStore } from '../mealPhotoQuotaStore';
import { fetchServerQuota, postConsume } from '../../lib/mealQuotaClient';
import { quotaDayKey } from '../../lib/mealPhotoQuota';

jest.mock('../../lib/mealQuotaClient', () => ({
  fetchServerQuota: jest.fn(),
  postConsume: jest.fn(),
}));

const status = (used: number) => ({ day: quotaDayKey(), tier: 'free' as const, limit: 2, used });

beforeEach(() => {
  jest.clearAllMocks();
  useMealPhotoQuotaStore.setState({ date: quotaDayKey(), mealsAnalyzed: 0, server: null, pending: [] });
});

describe('mealPhotoQuotaStore — synchro serveur', () => {
  it('garde la declaration en attente tant que le serveur est injoignable', async () => {
    (postConsume as jest.Mock).mockResolvedValue(null);
    (fetchServerQuota as jest.Mock).mockResolvedValue(null);

    useMealPhotoQuotaStore.getState().recordAnalyzedMeal('a-1');
    await useMealPhotoQuotaStore.getState().syncServer();

    expect(useMealPhotoQuotaStore.getState().mealsAnalyzed).toBe(1);
    expect(useMealPhotoQuotaStore.getState().pending).toEqual(['a-1']);
  });

  it('renvoie les declarations en attente au retour du reseau, dans l’ordre', async () => {
    useMealPhotoQuotaStore.setState({ pending: ['a-1', 'a-2'] });
    (postConsume as jest.Mock).mockResolvedValueOnce(status(1)).mockResolvedValueOnce(status(2));
    (fetchServerQuota as jest.Mock).mockResolvedValue(status(2));

    await useMealPhotoQuotaStore.getState().syncServer();

    expect((postConsume as jest.Mock).mock.calls.map(([id]) => id)).toEqual(['a-1', 'a-2']);
    expect(useMealPhotoQuotaStore.getState().pending).toEqual([]);
    expect(useMealPhotoQuotaStore.getState().server).toEqual(status(2));
  });

  it('s’arrete au premier echec sans perdre la suite', async () => {
    useMealPhotoQuotaStore.setState({ pending: ['a-1', 'a-2'] });
    (postConsume as jest.Mock).mockResolvedValueOnce(status(1)).mockResolvedValueOnce(null);
    (fetchServerQuota as jest.Mock).mockResolvedValue(null);

    await useMealPhotoQuotaStore.getState().syncServer();

    expect(useMealPhotoQuotaStore.getState().pending).toEqual(['a-2']);
    expect(useMealPhotoQuotaStore.getState().server).toEqual(status(1));
  });

  it('transmet la demande de rafraichissement apres un achat', async () => {
    (fetchServerQuota as jest.Mock).mockResolvedValue(status(0));
    await useMealPhotoQuotaStore.getState().syncServer({ refresh: true });
    expect(fetchServerQuota).toHaveBeenCalledWith({ refresh: true });
  });
});
