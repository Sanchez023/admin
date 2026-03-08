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

type SsoProvider = {
  id: string;
  providerType: string;
  name: string;
  issuerUrl: string;
  clientId: string;
  enabled: boolean;
};

type SsoPolicy = {
  mode: 'disabled' | 'optional' | 'required';
  autoProvision: boolean;
  defaultRole: string;
};

const CALLBACK_URL = typeof window !== 'undefined' ? `${window.location.origin}/api/auth/callback/oidc` : '';

export default function SSOPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<SsoProvider[]>([]);
  const [policy, setPolicy] = useState<SsoPolicy | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    providerType: 'oidc' as 'oidc' | 'saml',
    name: '',
    issuerUrl: '',
    clientId: '',
    clientSecret: '',
    redirectUri: CALLBACK_URL,
  });

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [providersRes, policyRes] = await Promise.all([
        request<{ items: SsoProvider[] }>('/admin/sso/providers', { method: 'GET' }),
        request<SsoPolicy>('/admin/sso/policy', { method: 'GET' }),
      ]);
      setProviders(Array.isArray(providersRes?.items) ? providersRes.items : []);
      setPolicy(policyRes ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handlePolicyChange = async (mode: 'disabled' | 'optional' | 'required') => {
    try {
      await request('/admin/sso/policy', {
        method: 'PUT',
        body: JSON.stringify({ mode }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '更新策略失败');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await request('/admin/sso/providers', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          redirectUri: form.redirectUri || CALLBACK_URL,
        }),
      });
      setModalOpen(false);
      setForm({
        providerType: 'oidc',
        name: '',
        issuerUrl: '',
        clientId: '',
        clientSecret: '',
        redirectUri: CALLBACK_URL,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    }
  };

  const toggleEnabled = async (id: string, enabled: boolean) => {
    try {
      await request(`/admin/sso/providers/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ enabled: !enabled }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
    }
  };

  const deleteProvider = async (id: string) => {
    if (!confirm('确定删除该 IdP 配置？')) return;
    try {
      await request(`/admin/sso/providers/${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary dark:text-dark-text">
          SSO
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-dark-text-secondary">
          IdP 配置、回调 URL 说明与测试登录
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-border dark:border-dark-border bg-surface dark:bg-dark-surface p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary dark:text-dark-text">
          SSO 策略
        </h2>
        <div className="flex items-center gap-3">
          <label className="text-sm text-text-secondary dark:text-dark-text-secondary">模式</label>
          <Select
            value={policy?.mode ?? 'optional'}
            onChange={(e) => handlePolicyChange(e.target.value as 'disabled' | 'optional' | 'required')}
            className="w-40"
          >
            <option value="disabled">disabled</option>
            <option value="optional">optional</option>
            <option value="required">required</option>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border border-border dark:border-dark-border bg-surface dark:bg-dark-surface p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary dark:text-dark-text">
            回调 URL（配置到 IdP）
          </h2>
        </div>
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
          在 IdP 中配置的重定向 URI 需与此一致，以便 OAuth2/OIDC 回调。
        </p>
        <code className="block px-4 py-2 rounded-lg bg-surface-inset dark:bg-dark-surface-inset text-sm text-text-primary dark:text-dark-text break-all">
          {CALLBACK_URL || '(请在前端环境查看)'}
        </code>
      </div>

      <div className="rounded-xl border border-border dark:border-dark-border bg-surface dark:bg-dark-surface overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border dark:border-dark-border">
          <h2 className="text-lg font-semibold text-text-primary dark:text-dark-text">
            IdP 列表
          </h2>
          <Button onClick={() => setModalOpen(true)}>新建 IdP</Button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-text-secondary dark:text-dark-text-secondary">
            加载中...
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableHeader>名称</TableHeader>
              <TableHeader>类型</TableHeader>
              <TableHeader>Issuer</TableHeader>
              <TableHeader>启用</TableHeader>
              <TableHeader>操作</TableHeader>
            </TableHead>
            <TableBody>
              {providers.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.providerType}</TableCell>
                  <TableCell className="max-w-xs truncate" title={row.issuerUrl}>
                    {row.issuerUrl}
                  </TableCell>
                  <TableCell>{row.enabled ? '是' : '否'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => toggleEnabled(row.id, row.enabled)}
                      >
                        {row.enabled ? '禁用' : '启用'}
                      </Button>
                      <Button variant="danger" onClick={() => deleteProvider(row.id)}>
                        删除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {!loading && providers.length === 0 && (
          <div className="p-8 text-center text-text-muted dark:text-dark-text-muted">
            暂无 IdP，点击「新建 IdP」添加
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="新建 IdP"
        subtitle="OIDC 或 SAML 身份提供商"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              取消
            </Button>
            <Button type="submit" form="sso-form">创建</Button>
          </>
        }
        maxWidth="xl"
      >
        <form id="sso-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-1">类型</label>
              <Select
                value={form.providerType}
                onChange={(e) => setForm((f) => ({ ...f, providerType: e.target.value as 'oidc' | 'saml' }))}
              >
                <option value="oidc">OIDC</option>
                <option value="saml">SAML</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-1">显示名称</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="My IdP"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-1">Issuer URL</label>
            <Input
              value={form.issuerUrl}
              onChange={(e) => setForm((f) => ({ ...f, issuerUrl: e.target.value }))}
              placeholder="https://..."
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-1">Client ID</label>
              <Input
                value={form.clientId}
                onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-1">Client Secret</label>
              <Input
                type="password"
                value={form.clientSecret}
                onChange={(e) => setForm((f) => ({ ...f, clientSecret: e.target.value }))}
                placeholder="可选"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-1">Redirect URI</label>
            <Input
              value={form.redirectUri}
              onChange={(e) => setForm((f) => ({ ...f, redirectUri: e.target.value }))}
              placeholder={CALLBACK_URL}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
