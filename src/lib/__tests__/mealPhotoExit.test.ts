/**
 * Tests du flux de sortie de l'écran photo de repas.
 *
 * Pendant une analyse HTTPS, le flux doit toujours annuler la requête, attendre
 * isGenerating === false, fermer ensuite — et ne jamais laisser remonter
 * l'exception d'interrupt().
 */

import { createMealPhotoExitFlow, safeInterrupt } from '../mealPhotoExit';

function makeFlow() {
  const interrupt = jest.fn();
  const close = jest.fn();
  const onPendingChange = jest.fn();
  const flow = createMealPhotoExitFlow({ interrupt, close, onPendingChange });
  return { flow, interrupt, close, onPendingChange };
}

describe('safeInterrupt', () => {
  it('appelle interrupt() normalement', () => {
    const interrupt = jest.fn();
    safeInterrupt(interrupt);
    expect(interrupt).toHaveBeenCalledTimes(1);
  });

  it('avale ModuleNotLoaded (modèle non chargé au démontage)', () => {
    const interrupt = jest.fn(() => {
      throw new Error("Cannot interrupt a model that's not loaded.");
    });
    expect(() => safeInterrupt(interrupt)).not.toThrow();
  });
});

describe('createMealPhotoExitFlow', () => {
  it('sans génération en cours : fermeture immédiate, sans interrupt', () => {
    const { flow, interrupt, close, onPendingChange } = makeFlow();
    flow.requestClose(false);
    expect(close).toHaveBeenCalledTimes(1);
    expect(interrupt).not.toHaveBeenCalled();
    expect(onPendingChange).not.toHaveBeenCalled();
  });

  it('génération en cours : interrupt() d\'abord, fermeture seulement après la fin', () => {
    const { flow, interrupt, close } = makeFlow();

    flow.requestClose(true);
    // Ordre strict : interrupt appelé, close PAS encore (démonter maintenant
    // lèverait ModelGenerating dans le cleanup de useLLM → crash natif).
    expect(interrupt).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
    expect(flow.isPending()).toBe(true);

    // La génération se termine (promesse native résolue après interrupt).
    flow.handleGeneratingChange(false);
    expect(close).toHaveBeenCalledTimes(1);
    expect(interrupt.mock.invocationCallOrder[0]).toBeLessThan(
      close.mock.invocationCallOrder[0]
    );
    expect(flow.isPending()).toBe(false);
  });

  it('notifie l\'UI du passage en attente puis de la sortie d\'attente', () => {
    const { flow, onPendingChange } = makeFlow();
    flow.requestClose(true);
    expect(onPendingChange).toHaveBeenNthCalledWith(1, true);
    flow.handleGeneratingChange(false);
    expect(onPendingChange).toHaveBeenNthCalledWith(2, false);
  });

  it('demande de sortie répétée pendant l\'attente : idempotent, une seule fermeture', () => {
    const { flow, interrupt, close, onPendingChange } = makeFlow();
    flow.requestClose(true);
    flow.requestClose(true);
    flow.requestClose(true);
    expect(onPendingChange).toHaveBeenCalledTimes(1);

    flow.handleGeneratingChange(false);
    expect(close).toHaveBeenCalledTimes(1);
    expect(interrupt).toHaveBeenCalledTimes(3);
  });

  it('interrupt() qui lève (module non chargé) : pas de crash, fermeture à la fin', () => {
    const interrupt = jest.fn(() => {
      throw new Error('ModuleNotLoaded');
    });
    const close = jest.fn();
    const flow = createMealPhotoExitFlow({ interrupt, close, onPendingChange: jest.fn() });

    expect(() => flow.requestClose(true)).not.toThrow();
    expect(close).not.toHaveBeenCalled();

    flow.handleGeneratingChange(false);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('génération toujours en cours : la fermeture reste en attente', () => {
    const { flow, close } = makeFlow();
    flow.requestClose(true);
    flow.handleGeneratingChange(true);
    flow.handleGeneratingChange(true);
    expect(close).not.toHaveBeenCalled();
    expect(flow.isPending()).toBe(true);
  });

  it('changement de génération sans demande de sortie : aucune fermeture', () => {
    const { flow, close } = makeFlow();
    flow.handleGeneratingChange(true);
    flow.handleGeneratingChange(false);
    expect(close).not.toHaveBeenCalled();
  });

  it('après fermeture effective : plus aucun appel ne referme', () => {
    const { flow, close } = makeFlow();
    flow.requestClose(false);
    flow.requestClose(false);
    flow.handleGeneratingChange(false);
    expect(close).toHaveBeenCalledTimes(1);
  });
});
