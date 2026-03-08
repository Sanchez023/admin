'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { request } from '@/lib/auth-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/Table';

type LogItem = {
  id: string;
  client: string;
  level: string;
  message: string;
  createdAt: string;
  meta?: { action?: string; resource?: string };
};

const PAGE_SIZE = 20;
const LEVELS = ['debug', 'info', 'warn', 'error'];
const CLIENTS = ['desktop', 'web'];

export default function LogsPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<LogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({
    startTime: '',
    endTime: '',
    client: '',
    level: searchParams.get('level') ?? '',
    action: searchParams.get('action') ?? '',
  });

  useEffect(() => {
    setPage(0);
  }, [filters.startTime, filters.endTime, filters.client, filters.level, filters.action]);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.startTime) params.set('startTime', filters.startTime);
      if (filters.endTime) params.set('endTime', filters.endTime);
      if (filters.client) params.set('client', filters.client);
      if (filters.level) params.set('level', filters.level);
      if (filters.action) params.set('action', filters.action);
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(page * PAGE_SIZE));
      const res = await request<{ items: LogItem[]; total: number }>(
        `/admin/logs?${params.toString()}`,
        { method: 'GET' }
      );
      setItems(Array.isArray(res?.items) ? res.items : []);
      setTotal(res?.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const params = new URLSearchParams();
      params.set('format', format);
      if (filters.startTime) params.set('startTime', filters.startTime);
      if (filters.endTime) params.set('endTime', filters.endTime);
      if (filters.client) params.set('client', filters.client);
      if (filters.level) params.set('level', filters.level);
      if (filters.action) params.set('action', filters.action);
      const { getAuthHeaders } = await import('@/lib/auth-client');
      const res = await fetch(`/api/admin/logs/export?${params.toString()}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `logs-${new Date().toISOString().slice(0, 10)}.${format}`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setError(e instanceof Error ? e.message : '导出失败');
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary dark:text-dark-text">
          日志
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-dark-text-secondary">
          按时间、端类型、级别筛选与导出
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-border dark:border-dark-border bg-surface dark:bg-dark-surface p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-muted dark:text-dark-text-muted mb-1">开始时间</label>
            <Input
              type="datetime-local"
              value={filters.startTime}
              onChange={(e) => setFilters((f) => ({ ...f, startTime: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted dark:text-dark-text-muted mb-1">结束时间</label>
            <Input
              type="datetime-local"
              value={filters.endTime}
              onChange={(e) => setFilters((f) => ({ ...f, endTime: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted dark:text-dark-text-muted mb-1">端类型</label>
            <Select
              value={filters.client}
              onChange={(e) => setFilters((f) => ({ ...f, client: e.target.value }))}
            >
              <option value="">全部</option>
              {CLIENTS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted dark:text-dark-text-muted mb-1">级别</label>
            <Select
              value={filters.level}
              onChange={(e) => setFilters((f) => ({ ...f, level: e.target.value }))}
            >
              <option value="">全部</option>
              {LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted dark:text-dark-text-muted mb-1">动作</label>
            <Input
              value={filters.action}
              onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
              placeholder="如 logs.ingest"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={load}>筛选</Button>
          <Button variant="secondary" onClick={() => handleExport('csv')}>
            导出 CSV
          </Button>
          <Button variant="secondary" onClick={() => handleExport('json')}>
            导出 JSON
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border dark:border-dark-border bg-surface dark:bg-dark-surface overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-text-secondary dark:text-dark-text-secondary">
            加载中...
          </div>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableHeader>时间</TableHeader>
                <TableHeader>端</TableHeader>
                <TableHeader>级别</TableHeader>
                <TableHeader>动作</TableHeader>
                <TableHeader>详情</TableHeader>
              </TableHead>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-text-muted dark:text-dark-text-muted whitespace-nowrap">
                      {row.createdAt}
                    </TableCell>
                    <TableCell>{row.client}</TableCell>
                    <TableCell>
                      <span
                        className={
                          row.level === 'error'
                            ? 'text-red-600 dark:text-red-400'
                            : row.level === 'warn'
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : ''
                        }
                      >
                        {row.level}
                      </span>
                    </TableCell>
                    <TableCell className="text-text-secondary dark:text-dark-text-secondary">
                      {(row.meta as { action?: string })?.action ?? '-'}
                    </TableCell>
                    <TableCell className="max-w-md truncate" title={row.message}>
                      {row.message}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {items.length === 0 && (
              <div className="p-8 text-center text-text-muted dark:text-dark-text-muted">
                暂无数据
              </div>
            )}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border dark:border-dark-border">
                <span className="text-sm text-text-secondary dark:text-dark-text-secondary">
                  共 {total} 条
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    上一页
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
