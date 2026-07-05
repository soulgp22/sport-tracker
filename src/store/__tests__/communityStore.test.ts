jest.mock('@react-native-async-storage/async-storage');

import {
  COMMUNITY_BASE_URL,
  COMMUNITY_MANIFEST_CACHE_KEY,
  COMMUNITY_MANIFEST_URL,
} from '../../constants/community';
import { useCommunityStore, type CommunityManifest } from '../communityStore';
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
    version: 1,
    programs: [
      {
        id,
        name: 'Push Pull Legs',
        description: 'Programme prêt à importer.',
        author: 'Sport Tracker',
        level: 'Intermédiaire',
        daysCount: 6,
        file: `${id}.json`,
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
      error: 'Impossible de charger les programmes communautaires.',
      offline: false,
    });
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
});
