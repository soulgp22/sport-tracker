// Config plugin local : configure les points d'entree Android et enregistre le
// delegate de permissions Health Connect dans MainActivity.kt (requis par
// react-native-health-connect v3 pour le flow requestPermission).
const { withAndroidManifest, withMainActivity } = require('@expo/config-plugins');

const IMPORT_LINE =
  'import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate';
const ANCHOR_IMPORT = 'import expo.modules.ReactActivityDelegateWrapper';
const ANCHOR_CREATE = 'super.onCreate(null)';
const DELEGATE_CALL =
  '    HealthConnectPermissionDelegate.setPermissionDelegate(this)';
const PERMISSIONS_RATIONALE_ACTION =
  'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE';
const VIEW_PERMISSION_USAGE_ALIAS = 'ViewPermissionUsageActivity';

module.exports = function withHealthConnectPermissionDelegate(config) {
  config = withMainActivity(config, (mod) => {
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

  return withAndroidManifest(config, (mod) => {
    const application = mod.modResults?.manifest?.application?.[0];
    if (!application || typeof application !== 'object' || Array.isArray(application)) {
      throw new Error(
        'withHealthConnect: structure AndroidManifest inattendue, manifest.application[0] introuvable'
      );
    }

    const activities = application.activity;
    if (!Array.isArray(activities)) {
      throw new Error(
        'withHealthConnect: structure AndroidManifest inattendue, manifest.application[0].activity doit etre un tableau'
      );
    }

    const activityAliases = application['activity-alias'] ?? [];
    if (!Array.isArray(activityAliases)) {
      throw new Error(
        'withHealthConnect: structure AndroidManifest inattendue, manifest.application[0].activity-alias doit etre un tableau'
      );
    }
    application['activity-alias'] = activityAliases;

    if (
      !activityAliases.some(
        (alias) => alias?.$?.['android:name'] === VIEW_PERMISSION_USAGE_ALIAS
      )
    ) {
      activityAliases.push({
        $: {
          'android:name': VIEW_PERMISSION_USAGE_ALIAS,
          'android:exported': 'true',
          'android:targetActivity': '.MainActivity',
          'android:permission': 'android.permission.START_VIEW_PERMISSION_USAGE',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.intent.action.VIEW_PERMISSION_USAGE',
                },
              },
            ],
            category: [
              {
                $: {
                  'android:name': 'android.intent.category.HEALTH_PERMISSIONS',
                },
              },
            ],
          },
        ],
      });
    }

    // Le config plugin de react-native-health-connect 3.5.3 ajoute ce filtre
    // sans verifier sa presence. Les mods de manifeste Expo etant composes dans
    // l'ordre inverse de leur declaration, il s'execute apres ce plugin local :
    // on retire donc les occurrences persistees, puis le paquet en recree une.
    for (const component of [...activities, ...activityAliases]) {
      const intentFilters = component['intent-filter'];
      if (intentFilters === undefined) {
        continue;
      }
      if (!Array.isArray(intentFilters)) {
        throw new Error(
          'withHealthConnect: structure AndroidManifest inattendue, intent-filter doit etre un tableau'
        );
      }

      component['intent-filter'] = intentFilters.filter((intentFilter) => {
        const containsPermissionsRationaleAction = intentFilter.action?.some(
          (action) => action?.$?.['android:name'] === PERMISSIONS_RATIONALE_ACTION
        );
        if (!containsPermissionsRationaleAction) {
          return true;
        }
        return false;
      });
    }

    return mod;
  });
};
