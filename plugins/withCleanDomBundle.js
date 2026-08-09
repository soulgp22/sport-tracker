// Config plugin local : supprime les bundles DOM Expo generes avant chaque
// tache de bundling Android. Le nom des fichiers etant hashe, ils s'accumulent
// sinon dans www.bundle entre deux builds et gonflent l'APK.
const { withAppBuildGradle } = require('@expo/config-plugins');

const MARKER = '// [withCleanDomBundle]';
const ANCHOR = 'android {';
const CLEAN_BLOCK = `${MARKER}
// Nettoie la sortie DOM de chaque variante juste avant que Metro la regenere.
tasks.configureEach { task ->
    def matcher = task.name =~ /^createBundle(.+)JsAndAssets$/
    if (matcher.matches()) {
        def variantSegment = matcher.group(1)
        def variantName = variantSegment.substring(0, 1).toLowerCase() + variantSegment.substring(1)

        task.doFirst {
            project.delete(file("\${buildDir}/generated/assets/react/\${variantName}/www.bundle"))
        }
    }
}`;

module.exports = function withCleanDomBundle(config) {
  return withAppBuildGradle(config, (mod) => {
    const contents = mod.modResults.contents;

    if (contents.includes(MARKER)) {
      return mod;
    }

    if (!contents.includes(ANCHOR)) {
      throw new Error('withCleanDomBundle: ancre android introuvable dans android/app/build.gradle');
    }

    mod.modResults.contents = contents.replace(ANCHOR, `${CLEAN_BLOCK}\n\n${ANCHOR}`);
    return mod;
  });
};
