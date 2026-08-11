import { PROFILE_COMPLETION_DESTINATION } from '../routes';

describe('routes', () => {
  it('PROFILE_COMPLETION_DESTINATION points to the profile tab', () => {
    expect(PROFILE_COMPLETION_DESTINATION).toBe('/(tabs)/profile');
  });
});
