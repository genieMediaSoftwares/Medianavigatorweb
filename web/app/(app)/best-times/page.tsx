import { redirect } from 'next/navigation';

export const metadata = { title: 'Best times · Media Navigator' };

/** Best times now lives inside Insights, next to the other analysis views. */
export default function BestTimesPage() {
  redirect('/insights?tab=best_times');
}
