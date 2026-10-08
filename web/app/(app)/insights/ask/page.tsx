import type { Metadata } from 'next';
import { AskView } from './AskView';

export const metadata: Metadata = { title: 'Ask' };

export default function AskPage() {
  return <AskView />;
}
