import {
  FOODS_CATALOG_DESTINATION,
  PROFILE_COMPLETION_DESTINATION,
} from '../routes';

describe('routes', () => {
  it('PROFILE_COMPLETION_DESTINATION points to the profile tab', () => {
    expect(PROFILE_COMPLETION_DESTINATION).toBe('/(tabs)/profile');
  });

  it('FOODS_CATALOG_DESTINATION points to the foods tab', () => {
    expect(FOODS_CATALOG_DESTINATION).toBe('/(tabs)/foods');
  });
});
