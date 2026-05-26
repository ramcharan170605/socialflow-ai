export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { DashboardView } from '@/components/DashboardView';

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="container" style={{ padding: '2rem 0' }}>
          <div className="skeleton" style={{ height: 200 }} />
        </div>
      }
    >
      <DashboardView />
    </Suspense>
  );
}
