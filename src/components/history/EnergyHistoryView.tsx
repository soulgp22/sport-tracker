import { useEnergyHistory } from '../../hooks/useEnergyHistory';
import { useHealthConnectFlow } from '../../hooks/useHealthConnectFlow';
import {
  EnergyHistoryList,
  type HistoryMetric,
} from './EnergyHistoryList';

export function EnergyHistoryView({ metric }: { metric: HistoryMetric }) {
  // Le hook relit Health Connect a chaque focus ; il ne tourne donc que
  // lorsque cette vue est reellement affichee.
  const { daily, healthStatus, loadHealth } = useEnergyHistory();
  // Connexion Health Connect sur place : plus besoin de passer par Nutrition.
  const { connect, connecting } = useHealthConnectFlow(loadHealth);
  return (
    <EnergyHistoryList
      metric={metric}
      daily={daily}
      healthStatus={healthStatus}
      onConnect={connect}
      connecting={connecting}
    />
  );
}
