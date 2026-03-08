'use client';

import { useCallback, useEffect, useState } from 'react';
import { FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
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
import { PROVIDER_PRESETS, getPresetByProviderId, type ApiType } from '@/lib/llm-presets';

type ExtraModel = { id: string; name: string };

type Provider = {
  id: string;
  providerId: string;
  displayName: string | null;
  baseUrl: string | null;
  activeModel: string | null;
  isActive: boolean;
  apiKeyMasked?: string;
  apiType?: ApiType | null;
  extraModels?: ExtraModel[];
};

type ActiveModel = { providerId: string; model: string };

const defaultForm = {
  providerId: '',
  displayName: '',
  baseUrl: '',
  apiKey: '',
  apiType: 'openai' as ApiType,
  activeModel: '',
  isActive: false,
  extraModels: [] as ExtraModel[],
};

export default function LLMPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [active, setActive] = useState<ActiveModel | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [providersRes, activeRes] = await Promise.all([
        request<{ items: Provider[] }>('/admin/llm/providers', { method: 'GET' }),
        request<ActiveModel>('/admin/llm/active', { method: 'GET' }),
      ]);
      setProviders(Array.isArray(providersRes?.items) ? providersRes.items : []);
      setActive(activeRes ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const applyPreset = (providerId: string) => {
    const preset = getPresetByProviderId(providerId);
    if (!preset) return;
    setForm((f) => ({
      ...f,
      providerId: preset.providerId,
      baseUrl: preset.baseUrl,
      apiType: preset.apiType,
      extraModels: preset.models.length ? [...preset.models] : f.extraModels,
    }));
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setModalOpen(true);
    setTestResult(null);
  };

  const openEdit = (p: Provider) => {
    setEditingId(p.id);
    setForm({
      providerId: p.providerId,
      displayName: p.displayName ?? '',
      baseUrl: p.baseUrl ?? '',
      apiKey: '',
      apiType: p.apiType ?? 'openai',
      activeModel: p.activeModel ?? '',
      isActive: p.isActive,
      extraModels: Array.isArray(p.extraModels) ? p.extraModels.map((m) => ({ ...m })) : [],
    });
    setModalOpen(true);
    setTestResult(null);
  };

  const addExtraModel = () => {
    setForm((f) => ({
      ...f,
      extraModels: [...f.extraModels, { id: '', name: '' }],
    }));
  };

  const updateExtraModel = (index: number, field: 'id' | 'name', value: string) => {
    setForm((f) => {
      const next = [...f.extraModels];
      next[index] = { ...next[index], [field]: value };
      return { ...f, extraModels: next };
    });
  };

  const removeExtraModel = (index: number) => {
    setForm((f) => ({
      ...f,
      extraModels: f.extraModels.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const extraModels = form.extraModels.filter((m) => m.id.trim());
    try {
      if (editingId) {
        const body: Record<string, unknown> = {
          displayName: form.displayName || null,
          baseUrl: form.baseUrl || null,
          apiType: form.apiType,
          activeModel: form.activeModel || null,
          isActive: form.isActive,
          extraModels: extraModels.map((m) => ({ id: m.id.trim(), name: (m.name || m.id).trim() })),
        };
        if (form.apiKey) body.apiKey = form.apiKey;
        await request(`/admin/llm/providers/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
      } else {
        await request('/admin/llm/providers', {
          method: 'POST',
          body: JSON.stringify({
            providerId: form.providerId.trim(),
            displayName: form.displayName || null,
            baseUrl: form.baseUrl || null,
            apiKey: form.apiKey || undefined,
            apiType: form.apiType,
            activeModel: form.activeModel || null,
            isActive: form.isActive,
            extraModels: extraModels.map((m) => ({ id: m.id.trim(), name: (m.name || m.id).trim() })),
          }),
        });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    }
  };

  const handleSetActive = async (providerId: string, model: string) => {
    if (!model.trim()) {
      setError('请填写模型名');
      return;
    }
    try {
      await request('/admin/llm/active', {
        method: 'PUT',
        body: JSON.stringify({ providerId, model: model.trim() }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '设置失败');
    }
  };

  const handleTest = async (id: string) => {
    setTestResult(null);
    try {
      const res = await request<{ ok: boolean; latency?: number; message?: string }>(
        `/admin/llm/providers/${id}/test`,
        { method: 'POST' }
      );
      setTestResult(res?.ok ? `连接成功，延迟 ${res.latency ?? 0}ms` : (res?.message ?? '未知'));
    } catch (e) {
      setTestResult(e instanceof Error ? e.message : '测试失败');
    }
  };

  const deleteProvider = async (id: string) => {
    if (!confirm('确定删除该 Provider？')) return;
    try {
      await request(`/admin/llm/providers/${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary dark:text-dark-text">
          大模型配置
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-dark-text-secondary">
          与 Desktop 端对齐：Provider 列表、API 协议、模型列表、测试连接、设置默认模型
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
            Provider 列表
          </h2>
          <Button onClick={openCreate}>新建 Provider</Button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-text-secondary dark:text-dark-text-secondary">
            加载中...
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableHeader>Provider</TableHeader>
              <TableHeader>API 协议</TableHeader>
              <TableHeader>Base URL</TableHeader>
              <TableHeader>API Key</TableHeader>
              <TableHeader>当前模型</TableHeader>
              <TableHeader>模型数</TableHeader>
              <TableHeader>激活</TableHeader>
              <TableHeader>操作</TableHeader>
            </TableHead>
            <TableBody>
              {providers.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    {row.displayName || row.providerId}
                  </TableCell>
                  <TableCell className="text-text-muted dark:text-dark-text-muted">
                    {row.apiType ?? '-'}
                  </TableCell>
                  <TableCell className="max-w-xs truncate" title={row.baseUrl ?? ''}>
                    {row.baseUrl ?? '-'}
                  </TableCell>
                  <TableCell className="text-text-muted dark:text-dark-text-muted">
                    {row.apiKeyMasked ?? '-'}
                  </TableCell>
                  <TableCell>{row.activeModel ?? '-'}</TableCell>
                  <TableCell>
                    {Array.isArray(row.extraModels) ? row.extraModels.length : 0}
                  </TableCell>
                  <TableCell>{row.isActive ? '是' : '否'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => handleTest(row.id)}
                      >
                        测试
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleSetActive(row.providerId, row.activeModel || '')}
                      >
                        设为激活
                      </Button>
                      <Button variant="secondary" onClick={() => openEdit(row)}>
                        编辑
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
            暂无 Provider，点击「新建 Provider」添加（可选择预设快速填充）
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? '编辑 Provider' : '新建 Provider'}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              取消
            </Button>
            <Button type="submit" form="llm-form">保存</Button>
          </>
        }
        maxWidth="xl"
      >
        <form id="llm-form" onSubmit={handleSubmit} className="space-y-4">
          {testResult && (
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
              {testResult}
            </p>
          )}

          {!editingId && (
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-1">
                从预设填充
              </label>
              <Select
                value=""
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) applyPreset(v);
                }}
                className="w-full"
              >
                <option value="">-- 选择预设（可选）--</option>
                {PROVIDER_PRESETS.map((p) => (
                  <option key={p.providerId} value={p.providerId}>
                    {p.label} ({p.providerId})
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-1">Provider ID</label>
              <Input
                value={form.providerId}
                onChange={(e) => setForm((f) => ({ ...f, providerId: e.target.value }))}
                placeholder="openai / anthropic / deepseek / ollama"
                required
                disabled={!!editingId}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-1">显示名称</label>
              <Input
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                placeholder="可选"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-1">API 协议</label>
              <Select
                value={form.apiType}
                onChange={(e) => setForm((f) => ({ ...f, apiType: e.target.value as ApiType }))}
              >
                <option value="openai">OpenAI 兼容</option>
                <option value="anthropic">Anthropic 兼容</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-1">Base URL</label>
              <Input
                value={form.baseUrl}
                onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))}
                placeholder="https://api.openai.com/v1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-1">
              API Key {editingId && '(留空则不修改)'}
            </label>
            <Input
              type="password"
              value={form.apiKey}
              onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
              placeholder="sk-..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-1">当前模型（默认使用）</label>
            <Input
              value={form.activeModel}
              onChange={(e) => setForm((f) => ({ ...f, activeModel: e.target.value }))}
              placeholder="如 gpt-4o-mini、deepseek-chat"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-text-primary dark:text-dark-text">
                模型列表（供客户端选择）
              </label>
              <Button type="button" variant="secondary" className="py-1.5 px-2 text-xs" onClick={addExtraModel}>
                <Plus className="h-4 w-4 mr-1" />
                添加
              </Button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto rounded-lg border border-border dark:border-dark-border p-2">
              {form.extraModels.length === 0 ? (
                <p className="text-sm text-text-muted dark:text-dark-text-muted py-2">
                  暂无模型，可点击「添加」或从预设填充
                </p>
              ) : (
                form.extraModels.map((m, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={m.id}
                      onChange={(e) => updateExtraModel(i, 'id', e.target.value)}
                      placeholder="模型 id"
                      className="flex-1 min-w-0"
                    />
                    <Input
                      value={m.name}
                      onChange={(e) => updateExtraModel(i, 'name', e.target.value)}
                      placeholder="显示名"
                      className="flex-1 min-w-0"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      className="py-1.5 px-2"
                      onClick={() => removeExtraModel(i)}
                      aria-label="删除"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="rounded border-border dark:border-dark-border"
            />
            <span className="text-sm text-text-primary dark:text-dark-text">设为激活</span>
          </label>
        </form>
      </Modal>
    </div>
  );
}
