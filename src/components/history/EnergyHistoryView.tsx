import { useEnergyHistory } from '../../hooks/useEnergyHistory';
import {
  EnergyHistoryList,
  type HistoryMetric,
} from './EnergyHistoryList';

export function EnergyHistoryView({ metric }: { metric: HistoryMetric }) {
  // Le hook relit Health Connect a chaque focus ; il ne tourne donc que
  // lorsque cette vue est reellement affichee.
  const { daily, healthStatus } = useEnergyHistory();
  return <EnergyHistoryList metric={metric} daily={daily} healthStatus={healthStatus} />;
}
