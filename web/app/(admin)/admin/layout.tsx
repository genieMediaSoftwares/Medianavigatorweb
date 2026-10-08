import { AdminShell } from './AdminShell';

export default function AdminLayout({ children }: LayoutProps<'/admin'>) {
  return <AdminShell>{children}</AdminShell>;
}
