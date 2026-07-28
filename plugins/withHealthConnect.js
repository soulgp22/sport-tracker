// Config plugin local : enregistre le delegate de permissions Health Connect
// dans MainActivity.kt (requis par react-native-health-connect v3 pour le
// flow requestPermission). Idempotent — réappliqué à chaque prebuild EAS.
const { withMainActivity } = require('@expo/config-plugins');

const IMPORT_LINE =
  'import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate';
const ANCHOR_IMPORT = 'import expo.modules.ReactActivityDelegateWrapper';
const ANCHOR_CREATE = 'super.onCreate(null)';
const DELEGATE_CALL =
  '    HealthConnectPermissionDelegate.setPermissionDelegate(this)';

module.exports = function withHealthConnectPermissionDelegate(config) {
  return withMainActivity(config, (mod) => {
    if (mod.modResults.language !== 'kt') {
      return mod;
    }
    let contents = mod.modResults.contents;

    if (!contents.includes(IMPORT_LINE)) {
      if (!contents.includes(ANCHOR_IMPORT)) {
        throw new Error('withHealthConnect: ancre import introuvable dans MainActivity.kt');
      }
      contents = contents.replace(ANCHOR_IMPORT, `${ANCHOR_IMPORT}\n\n${IMPORT_LINE}`);
    }

    if (!contents.includes('HealthConnectPermissionDelegate.setPermissionDelegate')) {
      if (!contents.includes(ANCHOR_CREATE)) {
        throw new Error('withHealthConnect: ancre onCreate introuvable dans MainActivity.kt');
      }
      contents = contents.replace(ANCHOR_CREATE, `${ANCHOR_CREATE}\n${DELEGATE_CALL}`);
    }

    mod.modResults.contents = contents;
    return mod;
  });
};
