'use client';

import { useCallback, useEffect, useState } from 'react';
import { FormEvent } from 'react';
import { request } from '@/lib/auth-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import {
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/Table';

type McpServer = {
  id: string;
  name: string;
  description?: string;
  transportType: 'stdio' | 'http' | 'sse';
  command?: string;
  url?: string;
  enabled: boolean;
};

export default function MCPPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [servers, setServers] = useState<McpServer[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    transportType: 'stdio' as 'stdio' | 'http' | 'sse',
    command: '',
    args: '',
    url: '',
    env: '' as string,
    enabled: true,
  });

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await request<{ items: McpServer[] }>('/admin/mcp/servers', { method: 'GET' });
      setServers(Array.isArray(res?.items) ? res.items : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      name: '',
      description: '',
      transportType: 'stdio',
      command: '',
      args: '',
      url: '',
      env: '',
      enabled: true,
    });
    setModalOpen(true);
  };

  const openEdit = (s: McpServer) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      description: s.description ?? '',
      transportType: s.transportType,
      command: (s as { command?: string }).command ?? '',
      args: '',
      url: s.url ?? '',
      env: '',
      enabled: s.enabled,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        description: form.description || undefined,
        transportType: form.transportType,
        enabled: form.enabled,
      };
      if (form.transportType === 'stdio') {
        body.command = form.command || undefined;
        if (form.args.trim()) body.args = form.args.split(/\s+/).filter(Boolean);
      } else {
        body.url = form.url || undefined;
      }
      if (editingId) {
        await request(`/admin/mcp/servers/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
      } else {
        await request('/admin/mcp/servers', {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    }
  };

  const toggleEnabled = async (id: string, enabled: boolean) => {
    try {
      await request(`/admin/mcp/servers/${id}/enabled`, {
        method: 'PUT',
        body: JSON.stringify({ enabled: !enabled }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
    }
  };

  const deleteServer = async (id: string) => {
    if (!confirm('确定删除该 MCP Server？')) return;
    try {
      await request(`/admin/mcp/servers/${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary dark:text-dark-text">
          MCP
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-dark-text-secondary">
          MCP Server 列表、新建/编辑/删除（stdio / http / sse）
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-border dark:border-dark-border bg-surface dark:bg-dark-surface overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border dark:border-dark-border">
          <h2 className="text-lg font-semibold text-text-primary dark:text-dark-text">
            Server 列表
          </h2>
          <Button onClick={openCreate}>新建 Server</Button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-text-secondary dark:text-dark-text-secondary">
            加载中...
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableHeader>名称</TableHeader>
              <TableHeader>传输类型</TableHeader>
              <TableHeader>Command / URL</TableHeader>
              <TableHeader>启用</TableHeader>
              <TableHeader>操作</TableHeader>
            </TableHead>
            <TableBody>
              {servers.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.transportType}</TableCell>
                  <TableCell className="max-w-xs truncate" title={row.command ?? row.url ?? ''}>
                    {(row.transportType === 'stdio' ? row.command : row.url) ?? '-'}
                  </TableCell>
                  <TableCell>{row.enabled ? '是' : '否'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => toggleEnabled(row.id, row.enabled)}
                      >
                        {row.enabled ? '禁用' : '启用'}
                      </Button>
                      <Button variant="secondary" onClick={() => openEdit(row)}>
                        编辑
                      </Button>
                      <Button variant="danger" onClick={() => deleteServer(row.id)}>
                        删除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {!loading && servers.length === 0 && (
          <div className="p-8 text-center text-text-muted dark:text-dark-text-muted">
            暂无 MCP Server，点击「新建 Server」添加
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? '编辑 MCP Server' : '新建 MCP Server'}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              取消
            </Button>
            <Button type="submit" form="mcp-form">保存</Button>
          </>
        }
        maxWidth="xl"
      >
        <form id="mcp-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-1">名称</label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="my-mcp"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-1">描述</label>
            <Input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-1">传输类型</label>
            <Select
              value={form.transportType}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  transportType: e.target.value as 'stdio' | 'http' | 'sse',
                }))
              }
            >
              <option value="stdio">stdio</option>
              <option value="http">http</option>
              <option value="sse">sse</option>
            </Select>
          </div>
          {form.transportType === 'stdio' && (
            <>
              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-1">Command</label>
                <Input
                  value={form.command}
                  onChange={(e) => setForm((f) => ({ ...f, command: e.target.value }))}
                  placeholder="npx"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-1">Args（空格分隔）</label>
                <Input
                  value={form.args}
                  onChange={(e) => setForm((f) => ({ ...f, args: e.target.value }))}
                  placeholder="--stdio mcp-server"
                />
              </div>
            </>
          )}
          {(form.transportType === 'http' || form.transportType === 'sse') && (
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-1">URL</label>
              <Input
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
          )}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
              className="rounded border-border dark:border-dark-border"
            />
            <span className="text-sm text-text-primary dark:text-dark-text">启用</span>
          </label>
        </form>
      </Modal>
    </div>
  );
}