import type { Metadata } from 'next';
import { FilesView } from './FilesView';

export const metadata: Metadata = { title: 'Files settings' };

export default function FilesSettingsPage() {
  return <FilesView />;
}
