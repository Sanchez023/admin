'use client';

import { useCallback, useEffect, useState } from 'react';
import { FormEvent } from 'react';
import { request } from '@/lib/auth-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import {
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/Table';

type User = {
  id: string;
  email: string;
  name: string | null;
  isSuperAdmin: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function getV1Data<T>(res: unknown): T | undefined {
  return (res as { data?: T })?.data;
}

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '' });

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await request<{ data?: { items?: User[] } }>('/v1/admin/users', { method: 'GET' });
      const data = getV1Data<{ items?: User[] }>(res);
      setUsers(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await request('/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          name: form.name.trim() || undefined,
        }),
      });
      setModalOpen(false);
      setForm({ email: '', password: '', name: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    }
  };

  const toggleActive = async (user: User) => {
    try {
      await request(`/v1/admin/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary dark:text-dark-text">
          用户管理
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-dark-text-secondary">
          用户列表、创建、禁用/启用；无注册入口，用户由 Admin 创建或邀请
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
            用户列表
          </h2>
          <Button onClick={() => setModalOpen(true)}>新建用户</Button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-text-secondary dark:text-dark-text-secondary">
            加载中...
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableHeader>邮箱</TableHeader>
              <TableHeader>名称</TableHeader>
              <TableHeader>超级管理员</TableHeader>
              <TableHeader>状态</TableHeader>
              <TableHeader>更新时间</TableHeader>
              <TableHeader>操作</TableHeader>
            </TableHead>
            <TableBody>
              {users.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>{row.name ?? '—'}</TableCell>
                  <TableCell>{row.isSuperAdmin ? '是' : '否'}</TableCell>
                  <TableCell>{row.isActive ? '启用' : '禁用'}</TableCell>
                  <TableCell className="text-text-muted dark:text-dark-text-muted text-xs">
                    {row.updatedAt}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="secondary"
                      onClick={() => toggleActive(row)}
                    >
                      {row.isActive ? '禁用' : '启用'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {!loading && users.length === 0 && (
          <div className="p-8 text-center text-text-muted dark:text-dark-text-muted">
            暂无用户，请先创建用户或使用账号密码登录（需配置 ADMIN_BOOTSTRAP_PASSWORD 或种子用户）
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="新建用户"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              取消
            </Button>
            <Button type="submit" form="user-form">创建</Button>
          </>
        }
      >
        <form id="user-form" onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-1">邮箱</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="user@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-1">密码</label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="初始密码"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-1">名称（选填）</label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="显示名称"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
