jest.mock('@react-native-async-storage/async-storage');

import {
  COMMUNITY_BASE_URL,
  COMMUNITY_MANIFEST_CACHE_KEY,
  COMMUNITY_MANIFEST_URL,
} from '../../constants/community';
import { useCommunityStore, type CommunityManifest } from '../communityStore';
import { useFoodStore } from '../foodStore';
import { useProgramStore } from '../programStore';

const { store: asyncStorageStore } = jest.requireMock('@react-native-async-storage/async-storage') as {
  store: Map<string, string>;
};

const fetchMock = jest.fn();

function textResponse(text: string, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    text: jest.fn(async () => text),
  } as unknown as Response;
}

function manifestFixture(id = 'ppl-6'): CommunityManifest {
  return {
    version: 2,
    programs: [
      {
        id,
        name: 'Push Pull Legs',
        description: 'Programme prêt à importer.',
        author: 'Life Sport Tracker',
        level: 'Intermédiaire',
        daysCount: 6,
        exercisesCount: 36,
        file: `${id}.json`,
        goal: 'Hypertrophie',
        equipment: 'Barre, haltères et poulies',
        sessionsPerWeek: 6,
        sessionMinutes: 70,
        progression: 'Double progression puis deload.',
        tags: ['PPL', 'hypertrophie'],
      },
    ],
    foodDatabases: [
      {
        id: 'auchan-fr',
        name: 'Auchan France',
        description: 'Sélection communautaire.',
        author: 'Life Sport Tracker',
        retailer: 'Auchan',
        country: 'France',
        foodsCount: 1,
        format: 'json',
        file: 'foods-auchan-fr.json',
        disclaimer: 'Valeurs à vérifier sur l’emballage.',
      },
    ],
  };
}

beforeEach(() => {
  asyncStorageStore.clear();
  jest.clearAllMocks();
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  useCommunityStore.setState({
    data: null,
    loading: false,
    error: null,
    offline: false,
  });
  useProgramStore.setState({ programs: [], exercises: [] });
  useFoodStore.setState({ customFoods: [] });
});

describe('communityStore', () => {
  it('fetches and caches the community manifest', async () => {
    const manifest = manifestFixture();
    fetchMock.mockResolvedValueOnce(textResponse(JSON.stringify(manifest)));

    const result = await useCommunityStore.getState().fetchManifest();

    expect(fetchMock).toHaveBeenCalledWith(COMMUNITY_MANIFEST_URL);
    expect(result).toEqual(manifest);
    expect(useCommunityStore.getState()).toMatchObject({
      data: manifest,
      loading: false,
      error: null,
      offline: false,
    });
    expect(asyncStorageStore.get(COMMUNITY_MANIFEST_CACHE_KEY)).toBe(JSON.stringify(manifest));
  });

  it('keeps compatibility with a version 1 manifest without food databases', async () => {
    const manifest = manifestFixture();
    const legacyManifest = { version: 1, programs: manifest.programs };
    fetchMock.mockResolvedValueOnce(textResponse(JSON.stringify(legacyManifest)));

    const result = await useCommunityStore.getState().fetchManifest();

    expect(result).toEqual({
      version: 1,
      programs: manifest.programs,
      foodDatabases: [],
    });
  });

  it('keeps optional program metadata optional for legacy manifests', async () => {
    const legacyProgram = {
      id: 'legacy-program',
      name: 'Programme historique',
      description: 'Sans nouvelles métadonnées.',
      author: 'Life Sport Tracker',
      level: 'Débutant' as const,
      daysCount: 2,
      file: 'legacy-program.json',
    };
    fetchMock.mockResolvedValueOnce(textResponse(JSON.stringify({
      version: 1,
      programs: [legacyProgram],
    })));

    const result = await useCommunityStore.getState().fetchManifest();

    expect(result?.programs[0]).toEqual(legacyProgram);
  });

  it('rejects malformed optional program metadata', async () => {
    const manifest = manifestFixture();
    manifest.programs[0].sessionMinutes = 0;
    fetchMock.mockResolvedValueOnce(textResponse(JSON.stringify(manifest)));

    const result = await useCommunityStore.getState().fetchManifest();

    expect(result).toBeNull();
    expect(useCommunityStore.getState().error).toBe(
      'Impossible de charger les contenus communautaires.'
    );
  });

  it('falls back to the cached manifest when the network fails', async () => {
    const cachedManifest = manifestFixture('cached-ppl');
    asyncStorageStore.set(COMMUNITY_MANIFEST_CACHE_KEY, JSON.stringify(cachedManifest));
    fetchMock.mockRejectedValueOnce(new Error('offline'));

    const result = await useCommunityStore.getState().fetchManifest();

    expect(result).toEqual(cachedManifest);
    expect(useCommunityStore.getState()).toMatchObject({
      data: cachedManifest,
      loading: false,
      error: 'Hors-ligne, liste en cache.',
      offline: true,
    });
  });

  it('exposes an error when the manifest cannot be loaded and no cache exists', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));

    const result = await useCommunityStore.getState().fetchManifest();

    expect(result).toBeNull();
    expect(useCommunityStore.getState()).toMatchObject({
      data: null,
      loading: false,
      error: 'Impossible de charger les contenus communautaires.',
      offline: false,
    });
  });

  it('rejects unsafe program paths from the remote manifest', async () => {
    const manifest = manifestFixture();
    manifest.programs[0].file = '../profile.json';
    fetchMock.mockResolvedValueOnce(textResponse(JSON.stringify(manifest)));

    const result = await useCommunityStore.getState().fetchManifest();

    expect(result).toBeNull();
    expect(useCommunityStore.getState().error).toBe(
      'Impossible de charger les contenus communautaires.'
    );
  });

  it('rejects unsafe food database paths from the remote manifest', async () => {
    const manifest = manifestFixture();
    manifest.foodDatabases[0].file = '../foods.json';
    fetchMock.mockResolvedValueOnce(textResponse(JSON.stringify(manifest)));

    const result = await useCommunityStore.getState().fetchManifest();

    expect(result).toBeNull();
    expect(useCommunityStore.getState().error).toBe(
      'Impossible de charger les contenus communautaires.'
    );
  });

  it('downloads a program and imports it through the program store', async () => {
    const [entry] = manifestFixture().programs;
    const programPayload = {
      version: 1,
      programs: [
        {
          name: 'Programme communautaire',
          days: [{ name: 'Jour A', exercises: [] }],
        },
      ],
    };
    fetchMock.mockResolvedValueOnce(textResponse(JSON.stringify(programPayload)));

    const result = await useCommunityStore.getState().downloadProgram(entry);

    expect(fetchMock).toHaveBeenCalledWith(`${COMMUNITY_BASE_URL}${entry.file}`);
    expect(result.importedPrograms).toBe(1);
    expect(result.errors).toEqual([]);
    expect(useProgramStore.getState().programs).toHaveLength(1);
    expect(useProgramStore.getState().programs[0].name).toBe('Programme communautaire');
  });

  it('downloads and imports a community food database', async () => {
    const [entry] = manifestFixture().foodDatabases;
    const payload = {
      foods: [
        {
          id: 'auchan_test',
          name: 'Produit test Auchan',
          category: 'Tests',
          unit: 'g',
          nutritionPer100g: { calories: 100, protein: 10, carbs: 10, fat: 2 },
        },
      ],
    };
    fetchMock.mockResolvedValueOnce(textResponse(JSON.stringify(payload)));

    const result = await useCommunityStore.getState().downloadFoodDatabase(entry);

    expect(fetchMock).toHaveBeenCalledWith(`${COMMUNITY_BASE_URL}${entry.file}`);
    expect(result.added).toBe(1);
    expect(result.errors).toEqual([]);
  });
});
