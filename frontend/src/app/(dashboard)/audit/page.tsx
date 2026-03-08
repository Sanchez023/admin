'use client';

import { useCallback, useEffect, useState } from 'react';
import { request } from '@/lib/auth-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/Table';

type AuditItem = {
  id: string;
  action: string;
  resource: string;
  actorRole: string;
  targetId?: string;
  createdAt: string;
  details?: Record<string, unknown>;
};

const PAGE_SIZE = 20;

export default function AuditPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AuditItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({
    startTime: '',
    endTime: '',
    action: '',
  });

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.startTime) params.set('startTime', filters.startTime);
      if (filters.endTime) params.set('endTime', filters.endTime);
      if (filters.action) params.set('action', filters.action);
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(page * PAGE_SIZE));
      const res = await request<{ items: AuditItem[]; total: number }>(
        `/admin/audit?${params.toString()}`,
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

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary dark:text-dark-text">
          审计
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-dark-text-secondary">
          审计事件查询
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-border dark:border-dark-border bg-surface dark:bg-dark-surface p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            <label className="block text-xs font-medium text-text-muted dark:text-dark-text-muted mb-1">操作</label>
            <Input
              placeholder="筛选 action"
              value={filters.action}
              onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
            />
          </div>
        </div>
        <Button onClick={load}>筛选</Button>
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
                <TableHeader>操作</TableHeader>
                <TableHeader>资源</TableHeader>
                <TableHeader>角色</TableHeader>
                <TableHeader>目标 ID</TableHeader>
              </TableHead>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-text-muted dark:text-dark-text-muted whitespace-nowrap">
                      {row.createdAt}
                    </TableCell>
                    <TableCell>{row.action}</TableCell>
                    <TableCell>{row.resource}</TableCell>
                    <TableCell>{row.actorRole}</TableCell>
                    <TableCell className="text-text-secondary dark:text-dark-text-secondary">
                      {row.targetId ?? '-'}
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
