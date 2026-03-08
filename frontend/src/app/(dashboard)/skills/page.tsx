'use client';

import { useCallback, useEffect, useState } from 'react';
import { request } from '@/lib/auth-client';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import {
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/Table';

type Skill = {
  id: string;
  skillId: string;
  name?: string;
  enabled: boolean;
  sortOrder: number;
  config?: Record<string, string>;
};

export default function SkillsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configSkill, setConfigSkill] = useState<Skill | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await request<{ items: Skill[] }>('/admin/skills', { method: 'GET' });
      setSkills(Array.isArray(res?.items) ? res.items : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleEnabled = async (skill: Skill) => {
    try {
      await request(`/admin/skills/${skill.id}`, {
        method: 'PUT',
        body: JSON.stringify({ enabled: !skill.enabled }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
    }
  };

  const moveOrder = async (skill: Skill, delta: number) => {
    const newOrder = skill.sortOrder + delta;
    if (newOrder < 0) return;
    try {
      await request(`/admin/skills/${skill.id}`, {
        method: 'PUT',
        body: JSON.stringify({ sortOrder: newOrder }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
    }
  };

  const openConfig = (skill: Skill) => {
    setConfigSkill(skill);
    setConfigForm(skill.config ?? {});
    setConfigModalOpen(true);
  };

  const saveConfig = async () => {
    if (!configSkill) return;
    try {
      await request(`/admin/skills/${configSkill.id}/config`, {
        method: 'PUT',
        body: JSON.stringify({ config: configForm }),
      });
      setConfigModalOpen(false);
      setConfigSkill(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存配置失败');
    }
  };

  const createSkill = async () => {
    const rawSkillId = prompt('请输入 Skill ID（例如: mail）');
    const skillId = rawSkillId?.trim();
    if (!skillId) return;
    const name = prompt('请输入 Skill 名称（可选）')?.trim();
    try {
      await request('/admin/skills', {
        method: 'POST',
        body: JSON.stringify({
          skillId,
          name: name || undefined,
          enabled: true,
          sortOrder: (skills.at(-1)?.sortOrder ?? 0) + 10,
          config: {},
        }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '创建失败');
    }
  };

  const removeSkill = async (skill: Skill) => {
    if (!confirm(`确定删除 Skill「${skill.name ?? skill.skillId}」？`)) return;
    try {
      await request(`/admin/skills/${skill.id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary dark:text-dark-text">
          Skill
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-dark-text-secondary">
          列表、启用/顺序、Skill 配置项
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
            Skill 列表
          </h2>
          <Button onClick={createSkill}>新建 Skill</Button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-text-secondary dark:text-dark-text-secondary">
            加载中...
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableHeader>Skill ID</TableHeader>
              <TableHeader>名称</TableHeader>
              <TableHeader>顺序</TableHeader>
              <TableHeader>启用</TableHeader>
              <TableHeader>操作</TableHeader>
            </TableHead>
            <TableBody>
              {skills.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.skillId}</TableCell>
                  <TableCell>{row.name ?? row.skillId}</TableCell>
                  <TableCell>{row.sortOrder}</TableCell>
                  <TableCell>{row.enabled ? '是' : '否'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => toggleEnabled(row)}
                      >
                        {row.enabled ? '禁用' : '启用'}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => moveOrder(row, -1)}
                      >
                        上移
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => moveOrder(row, 1)}
                      >
                        下移
                      </Button>
                      <Button variant="secondary" onClick={() => openConfig(row)}>
                        配置
                      </Button>
                      <Button variant="danger" onClick={() => removeSkill(row)}>
                        删除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {!loading && skills.length === 0 && (
          <div className="p-8 text-center text-text-muted dark:text-dark-text-muted">
            暂无 Skill
          </div>
        )}
      </div>

      <Modal
        open={configModalOpen}
        onClose={() => { setConfigModalOpen(false); setConfigSkill(null); }}
        title={`Skill 配置: ${configSkill?.name ?? configSkill?.skillId ?? ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setConfigModalOpen(false); setConfigSkill(null); }}>
              取消
            </Button>
            <Button onClick={saveConfig}>保存</Button>
          </>
        }
      >
        <div className="space-y-3">
          {Object.keys(configForm).length === 0 && (
            <p className="text-sm text-text-muted dark:text-dark-text-muted">
              暂无配置项，或该 Skill 无预定义配置。可添加键值对：
            </p>
          )}
          {Object.entries(configForm).map(([key, value]) => (
            <div key={key} className="flex gap-2 items-center">
              <Input
                value={key}
                disabled
                className="flex-1"
              />
              <Input
                value={value}
                onChange={(e) =>
                  setConfigForm((f) => ({ ...f, [key]: e.target.value }))
                }
                className="flex-1"
              />
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              placeholder="新键名"
              id="new-config-key"
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const input = document.getElementById('new-config-key') as HTMLInputElement;
                  const key = input?.value?.trim();
                  if (key && !(key in configForm)) {
                    setConfigForm((f) => ({ ...f, [key]: '' }));
                    input.value = '';
                  }
                }
              }}
            />
            <Button
              variant="secondary"
              onClick={() => {
                const input = document.getElementById('new-config-key') as HTMLInputElement;
                const key = input?.value?.trim();
                if (key && !(key in configForm)) {
                  setConfigForm((f) => ({ ...f, [key]: '' }));
                  input.value = '';
                }
              }}
            >
              添加配置项
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
