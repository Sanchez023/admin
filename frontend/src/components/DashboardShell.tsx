'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  Lock,
  Bot,
  Zap,
  Plug,
  Building2,
  Users,
  Sun,
  Moon,
  type LucideIcon,
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { getStoredAuth, isAuthenticated, setStoredAuth, clearStoredAuth } from '@/lib/auth-client';
import { Button } from '@/components/ui/Button';

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/', label: '仪表盘', icon: LayoutDashboard },
  { href: '/logs', label: '日志', icon: FileText },
  { href: '/audit', label: '审计', icon: ClipboardList },
  { href: '/sso', label: 'SSO', icon: Lock },
  { href: '/llm', label: '大模型配置', icon: Bot },
  { href: '/skills', label: 'Skill', icon: Zap },
  { href: '/mcp', label: 'MCP', icon: Plug },
  { href: '/tenant', label: '组织管理', icon: Building2 },
  { href: '/users', label: '用户管理', icon: Users },
];

const LABELS: Record<string, string> = {
  '/': '仪表盘',
  '/logs': '日志',
  '/audit': '审计',
  '/sso': 'SSO',
  '/llm': '大模型配置',
  '/skills': 'Skill',
  '/mcp': 'MCP',
  '/tenant': '组织管理',
  '/users': '用户管理',
};

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [org, setOrg] = useState('default');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    const { org: o } = getStoredAuth();
    setOrg(o || 'default');
  }, [mounted, router]);

  const handleOrgChange = (value: string) => {
    setStoredAuth({ org: value || 'default' });
    setOrg(value || 'default');
  };

  const handleLogout = () => {
    clearStoredAuth();
    router.replace('/login');
  };

  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center bg-page dark:bg-dark-bg">
        <div className="text-text-secondary dark:text-dark-text-secondary">加载中...</div>
      </div>
    );
  }

  if (!isAuthenticated()) {
    return null;
  }

  const breadcrumb = LABELS[pathname] ?? '仪表盘';

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-page dark:bg-dark-bg">
      <div className="flex flex-1 min-h-0">
        <aside
          className="w-60 flex-shrink-0 flex flex-col bg-surface-muted dark:bg-dark-surface-muted border-r border-border dark:border-dark-border"
          aria-label="主导航"
        >
          <div className="p-4 border-b border-border dark:border-dark-border">
            <Link
              href="/"
              className="text-lg font-semibold text-primary dark:text-dark-primary hover:text-primary-light dark:hover:text-dark-primary-lighter"
            >
              Claw Admin
            </Link>
          </div>
          <nav className="flex-1 overflow-y-auto p-2">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${active
                      ? 'bg-primary-muted dark:bg-primary-muted text-primary dark:text-dark-primary'
                      : 'text-text-secondary dark:text-dark-text-secondary hover:bg-surface-hover dark:hover:bg-dark-surface-hover hover:text-text-primary dark:hover:text-dark-text'}
                  `}
                >
                  <item.icon className="h-5 w-5 shrink-0" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex-shrink-0 flex items-center justify-between px-6 border-b border-border dark:border-dark-border bg-surface dark:bg-dark-surface">
            <div className="flex items-center gap-4">
              <span className="text-sm text-text-secondary dark:text-dark-text-secondary">
                {breadcrumb}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-text-secondary dark:text-dark-text-secondary">
                组织
                <input
                  type="text"
                  value={org}
                  onChange={(e) => handleOrgChange(e.target.value)}
                  className="w-28 rounded-lg border border-border dark:border-dark-border bg-surface dark:bg-dark-surface px-2 py-1 text-sm focus:ring-2 focus:ring-primary-lighter dark:focus:ring-dark-primary-lighter"
                  aria-label="当前组织"
                />
              </label>
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-lg text-text-muted hover:bg-surface-hover dark:hover:bg-dark-surface-hover"
                aria-label={theme === 'dark' ? '切换至浅色' : '切换至深色'}
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <Button variant="ghost" onClick={handleLogout}>
                退出
              </Button>
            </div>
          </header>

          <main className="flex-1 min-h-0 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
