'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { request } from '@/lib/auth-client';
import { Button } from '@/components/ui/Button';

type CounterResponse = { total?: number };

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalLogs: 0,
    errorCount: 0,
    desktopCount: 0,
    webCount: 0,
    auditCount: 0,
  });

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayStartIso = todayStart.toISOString();

      const [logsTotalRes, errorTodayRes, desktopRes, webRes, auditRes] = await Promise.all([
        request<CounterResponse>('/admin/logs?limit=1', { method: 'GET' }),
        request<CounterResponse>(`/admin/logs?limit=1&level=error&startTime=${encodeURIComponent(todayStartIso)}`, { method: 'GET' }),
        request<CounterResponse>('/admin/logs?limit=1&client=desktop', { method: 'GET' }),
        request<CounterResponse>('/admin/logs?limit=1&client=web', { method: 'GET' }),
        request<CounterResponse>('/admin/audit?limit=1', { method: 'GET' }),
      ]);
      setStats({
        totalLogs: logsTotalRes?.total ?? 0,
        errorCount: errorTodayRes?.total ?? 0,
        desktopCount: desktopRes?.total ?? 0,
        webCount: webRes?.total ?? 0,
        auditCount: auditRes?.total ?? 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="text-text-secondary dark:text-dark-text-secondary">加载中...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary dark:text-dark-text">
          仪表盘
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-dark-text-secondary">
          今日日志与各端分布概览
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          title="日志总数"
          value={stats.totalLogs}
          href="/logs"
          linkLabel="查看日志"
        />
        <Card
          title="今日错误数"
          value={stats.errorCount}
          href="/logs?level=error"
          linkLabel="筛选错误"
        />
        <Card
          title="Desktop 端"
          value={stats.desktopCount}
          href="/logs?client=desktop"
          linkLabel="Desktop 日志"
        />
        <Card
          title="Web 端"
          value={stats.webCount}
          href="/logs?client=web"
          linkLabel="Web 日志"
        />
      </div>

      <div className="rounded-xl border border-border dark:border-dark-border bg-surface dark:bg-dark-surface shadow-card p-6">
        <h2 className="text-lg font-semibold text-text-primary dark:text-dark-text mb-4">
          审计事件
        </h2>
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-4">
          共 {stats.auditCount} 条审计记录
        </p>
        <Link href="/audit">
          <Button variant="secondary">进入审计</Button>
        </Link>
      </div>

      <div className="flex gap-3">
        <Button onClick={load}>刷新数据</Button>
      </div>
    </div>
  );
}

function Card({
  title,
  value,
  href,
  linkLabel,
}: {
  title: string;
  value: number;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="rounded-xl border border-border dark:border-dark-border bg-surface dark:bg-dark-surface shadow-card p-6 hover:shadow-card-hover dark:hover:shadow-card-hover-dark transition-shadow">
      <p className="text-sm font-medium text-text-secondary dark:text-dark-text-secondary">
        {title}
      </p>
      <p className="mt-2 text-2xl font-semibold text-text-primary dark:text-dark-text">
        {value}
      </p>
      <Link
        href={href}
        className="mt-3 inline-block text-sm font-medium text-primary dark:text-dark-primary hover:text-primary-light dark:hover:text-dark-primary-lighter"
      >
        {linkLabel} →
      </Link>
    </div>
  );
}
