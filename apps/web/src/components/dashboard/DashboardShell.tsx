import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Layout } from '@/components/layout/Layout';

type DashboardShellProps = {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function DashboardShell({ icon: Icon, title, subtitle, children }: DashboardShellProps) {
  return (
    <Layout title={title}>
      <div className="container py-8 px-4 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{title}</h1>
            <p className="text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {children}
      </div>
    </Layout>
  );
}
