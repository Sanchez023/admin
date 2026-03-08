'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setStoredAuth, isAuthenticated } from '@/lib/auth-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Mode = 'password' | 'token';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [org, setOrg] = useState('default');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/');
    }
  }, [router]);

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error?.message || '登录失败');
        return;
      }
      const access = data?.data?.access_token;
      if (access) {
        setStoredAuth({ token: access, org: org || 'default' });
        router.replace('/');
      } else {
        setError('登录失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleTokenSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const t = token.trim();
    const a = apiKey.trim();
    if (!t && !a) {
      setError('请填写 Bearer Token 或 API Key');
      return;
    }
    setStoredAuth({ token: t, apiKey: a, org: org || 'default' });
    router.replace('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-page dark:bg-dark-bg">
      <div className="w-full max-w-md">
        <div className="rounded-2xl shadow-modal border border-border dark:border-dark-border bg-surface dark:bg-dark-surface p-8">
          <h1 className="text-2xl font-semibold text-text-primary dark:text-dark-text text-center">
            Claw Admin
          </h1>
          <p className="mt-2 text-sm text-text-secondary dark:text-dark-text-secondary text-center">
            统一配置与管控中心
          </p>

          <div className="mt-4 flex gap-2 border-b border-border dark:border-dark-border">
            <button
              type="button"
              onClick={() => setMode('password')}
              className={`pb-2 text-sm font-medium ${mode === 'password' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary dark:text-dark-text-secondary'}`}
            >
              账号密码
            </button>
            <button
              type="button"
              onClick={() => setMode('token')}
              className={`pb-2 text-sm font-medium ${mode === 'token' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary dark:text-dark-text-secondary'}`}
            >
              Token / API Key
            </button>
          </div>

          {mode === 'password' ? (
            <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-1">
                  邮箱
                </label>
                <Input
                  type="email"
                  placeholder="admin@local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-1">
                  密码
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-1">
                  组织
                </label>
                <Input
                  type="text"
                  placeholder="default"
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '登录中…' : '登录'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleTokenSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-1">
                  Bearer Token
                </label>
                <Input
                  type="password"
                  placeholder="ADMIN_BOOTSTRAP_TOKEN"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-1">
                  API Key（二选一）
                </label>
                <Input
                  type="password"
                  placeholder="ADMIN_SERVICE_API_KEY"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-dark-text mb-1">
                  组织
                </label>
                <Input
                  type="text"
                  placeholder="default"
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
              <Button type="submit" className="w-full">
                登录
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-xs text-text-muted dark:text-dark-text-muted">
            无注册入口，用户由 Admin 创建或邀请
          </p>
        </div>
      </div>
    </div>
  );
}
