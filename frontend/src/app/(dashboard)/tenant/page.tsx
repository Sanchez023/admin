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

type Organization = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type Member = { userId: string; email: string; name: string | null; role: string; joinedAt: string };

export default function TenantPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    isActive: true,
  });
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [membersOrg, setMembersOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<{ id: string; email: string; name: string | null }[]>([]);
  const [addMemberUserId, setAddMemberUserId] = useState('');
  const [addMemberRole, setAddMemberRole] = useState<'member' | 'admin' | 'owner' | 'viewer'>('member');

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await request<{ items: Organization[] }>('/admin/organizations', { method: 'GET' });
      setOrganizations(Array.isArray(res?.items) ? res.items : []);
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
    setForm({ name: '', slug: '', isActive: true });
    setModalOpen(true);
  };

  const openEdit = (org: Organization) => {
    setEditingId(org.id);
    setForm({
      name: org.name,
      slug: org.slug,
      isActive: org.isActive,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingId) {
        await request(`/admin/organizations/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
      } else {
        await request('/admin/organizations', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    }
  };

  const toggleActive = async (org: Organization) => {
    try {
      await request(`/admin/organizations/${org.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !org.isActive }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
    }
  };

  const deleteOrg = async (id: string, slug: string) => {
    if (slug === 'default') {
      setError('不能删除 default 组织');
      return;
    }
    if (!confirm('确定删除该组织？')) return;
    try {
      await request(`/admin/organizations/${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败');
    }
  };

  const openMembers = async (org: Organization) => {
    setMembersOrg(org);
    setMembersModalOpen(true);
    setMembersLoading(true);
    setMembers([]);
    try {
      const res = await request<{ data?: { items?: Member[] } }>(`/v1/admin/organizations/${org.id}/members`, { method: 'GET' });
      const data = (res as { data?: { items?: Member[] } })?.data;
      setMembers(Array.isArray(data?.items) ? data.items : []);
      const usersRes = await request<{ data?: { items?: { id: string; email: string; name: string | null }[] } }>('/v1/admin/users', { method: 'GET' });
      const usersData = (usersRes as { data?: { items?: { id: string; email: string; name: string | null }[] } })?.data;
      setAllUsers(Array.isArray(usersData?.items) ? usersData.items : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载成员失败');
    } finally {
      setMembersLoading(false);
    }
  };

  const addMember = async (e: FormEvent) => {
    e.preventDefault();
    if (!membersOrg || !addMemberUserId) return;
    try {
      await request(`/v1/admin/organizations/${membersOrg.id}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId: addMemberUserId, role: addMemberRole }),
      });
      const res = await request<{ data?: { items?: Member[] } }>(`/v1/admin/organizations/${membersOrg.id}/members`, { method: 'GET' });
      const data = (res as { data?: { items?: Member[] } })?.data;
      setMembers(Array.isArray(data?.items) ? data.items : []);
      setAddMemberUserId('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '添加失败');
    }
  };

  const removeMember = async (userId: string) => {
    if (!membersOrg || !confirm('确定移出该成员？')) return;
    try {
      await request(`/v1/admin/organizations/${membersOrg.id}/members`, {
        method: 'DELETE',
        body: JSON.stringify({ userId }),
      });
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch (e) {
      setError(e instanceof Error ? e.message : '移除失败');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary dark:text-dark-text">
          系统 / 租户
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-dark-text-secondary">
          组织列表、创建/编辑/禁用；组织成员管理
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
            组织列表
          </h2>
          <Button onClick={openCreate}>新建组织</Button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-text-secondary dark:text-dark-text-secondary">
            加载中...
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableHeader>名称</TableHeader>
              <TableHeader>Slug</TableHeader>
              <TableHeader>状态</TableHeader>
              <TableHeader>更新时间</TableHeader>
              <TableHeader>操作</TableHeader>
            </TableHead>
            <TableBody>
              {organizations.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.slug}</TableCell>
                  <TableCell>{row.isActive ? '启用' : '禁用'}</TableCell>
                  <TableCell className="text-text-muted dark:text-dark-text-muted text-xs">
                    {row.updatedAt}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => openMembers(row)}>
                        成员
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => toggleActive(row)}
                      >
                        {row.isActive ? '禁用' : '启用'}
                      </Button>
                      <Button variant="secondary" onClick={() => openEdit(row)}>
                        编辑
                      </Button>
                      {row.slug !== 'default' && (
                        <Button variant="danger" onClick={() => deleteOrg(row.id, row.slug)}>
                          删除
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {!loading && organizations.length === 0 && (
          <div className="p-8 text-center text-text-muted dark:text-dark-text-muted">
            暂无组织
          </div>
        )}
      </div>

      <Modal
        open={membersModalOpen}
        onClose={() => setMembersModalOpen(false)}
        title={membersOrg ? `${membersOrg.name} - 成员` : '成员'}
        footer={null}
      >
        {membersOrg && (
          <div className="space-y-4">
            {membersLoading ? (
              <p className="text-sm text-text-secondary dark:text-dark-text-secondary">加载中...</p>
            ) : (
              <>
                <Table>
                  <TableHead>
                    <TableHeader>邮箱</TableHeader>
                    <TableHeader>名称</TableHeader>
                    <TableHeader>角色</TableHeader>
                    <TableHeader>操作</TableHeader>
                  </TableHead>
                  <TableBody>
                    {members.map((m) => (
                      <TableRow key={m.userId}>
                        <TableCell>{m.email}</TableCell>
                        <TableCell>{m.name ?? '—'}</TableCell>
                        <TableCell>{m.role}</TableCell>
                        <TableCell>
                          <Button variant="secondary" onClick={() => removeMember(m.userId)}>
                            移出
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <form onSubmit={addMember} className="flex flex-wrap items-end gap-2 pt-2 border-t border-border dark:border-dark-border">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-text-muted dark:text-dark-text-muted">用户</span>
                    <select
                      value={addMemberUserId}
                      onChange={(e) => setAddMemberUserId(e.target.value)}
                      className="rounded-lg border border-border dark:border-dark-border bg-surface dark:bg-dark-surface px-3 py-2 text-sm min-w-[180px]"
                    >
                      <option value="">选择用户</option>
                      {allUsers.filter((u) => !members.some((m) => m.userId === u.id)).map((u) => (
                        <option key={u.id} value={u.id}>{u.email}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-text-muted dark:text-dark-text-muted">角色</span>
                    <select
                      value={addMemberRole}
                      onChange={(e) => setAddMemberRole(e.target.value as typeof addMemberRole)}
                      className="rounded-lg border border-border dark:border-dark-border bg-surface dark:bg-dark-surface px-3 py-2 text-sm"
                    >
                      <option value="viewer">viewer</option>
                      <option value="member">member</option>
                      <option value="admin">admin</option>
                      <option value="owner">owner</option>
                    </select>
                  </label>
                  <Button type="submit" disabled={!addMemberUserId}>添加</Button>
                </form>
              </>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? '编辑组织' : '新建组织'}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              取消
            </Button>
            <Button type="submit" form="org-form">保存</Button>
          </>
        }
      >
        <form id="org-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-1">名称</label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="组织名称"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-1">Slug</label>
            <Input
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
              placeholder="org-slug"
              required
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="rounded border-border dark:border-dark-border"
            />
            <span className="text-sm text-text-primary dark:text-dark-text">启用</span>
          </label>
        </form>
      </Modal>
    </div>
  );
}
