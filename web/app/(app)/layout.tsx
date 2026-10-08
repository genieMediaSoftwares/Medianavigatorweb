import { AppShell } from '@/components/layout/AppShell';

export default function SignedInLayout({ children }: LayoutProps<'/'>) {
  return <AppShell>{children}</AppShell>;
}
