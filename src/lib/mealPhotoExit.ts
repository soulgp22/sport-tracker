/**
 * Flux de sortie de l'écran « photo de repas » (mode serveur HTTPS).
 *
 * Une analyse peut encore être en cours quand l'utilisateur ferme l'écran.
 * Ce module orchestre alors l'annulation de la requête, attend que son état
 * `isGenerating` retombe à false, puis ferme l'écran une seule fois. Les erreurs
 * d'annulation restent sans effet afin que la navigation demeure sûre.
 *
 * Aucune dépendance native ici : module 100 % testable sous Jest.
 */

export interface MealPhotoExitFlowDeps {
  /** `llm.interrupt` du hook useLLM (lève si le module natif n'est pas chargé). */
  interrupt: () => void;
  /** Fermeture effective de l'écran (démontage). Appelée une seule fois. */
  close: () => void;
  /** Notifie l'UI qu'une fermeture est en attente de fin de génération. */
  onPendingChange: (pending: boolean) => void;
}

export interface MealPhotoExitFlow {
  /**
   * Demande de sortie (bouton retour, back Android, onRequestClose).
   * - Pas de génération en cours → fermeture immédiate.
   * - Génération en cours → interrupt() puis attente : la fermeture aura lieu
   *   dans handleGeneratingChange(false). Idempotent tant que la fermeture
   *   est en attente.
   */
  requestClose: (isGenerating: boolean) => void;
  /** À appeler à chaque changement de `llm.isGenerating` (effet). */
  handleGeneratingChange: (isGenerating: boolean) => void;
  /** true entre la demande de sortie et la fin de la génération. */
  isPending: () => boolean;
}

/**
 * `interrupt()` lève `ModuleNotLoaded` quand le modèle n'est pas encore chargé
 * (ex. démontage pendant le téléchargement) : une exception dans un cleanup
 * React fait planter l'app. Ne jamais laisser remonter.
 */
export function safeInterrupt(interrupt: () => void): void {
  try {
    interrupt();
  } catch {
    // Module natif non chargé ou déjà interrompu : rien à couper.
  }
}

export function createMealPhotoExitFlow(deps: MealPhotoExitFlowDeps): MealPhotoExitFlow {
  let pending = false;
  let closed = false;

  const setPending = (value: boolean) => {
    if (pending === value) return;
    pending = value;
    deps.onPendingChange(value);
  };

  const closeOnce = () => {
    if (closed) return;
    closed = true;
    deps.close();
  };

  return {
    requestClose(isGenerating: boolean) {
      if (closed) return;
      if (!isGenerating) {
        closeOnce();
        return;
      }
      // Génération en cours : démonter maintenant ferait lever ModelGenerating
      // dans le cleanup de useLLM → crash. On coupe et on attend la fin.
      setPending(true);
      safeInterrupt(deps.interrupt);
    },

    handleGeneratingChange(isGenerating: boolean) {
      if (!pending || isGenerating) return;
      setPending(false);
      closeOnce();
    },

    isPending: () => pending,
  };
}
