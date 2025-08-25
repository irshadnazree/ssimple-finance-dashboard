import { createFileRoute } from '@tanstack/react-router';
import { ReportsPage } from '../components/reports/ReportsPage';

export const Route = createFileRoute('/reports')({component: Reports,})

function Reports() {
  return <ReportsPage />;
}