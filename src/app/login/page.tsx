'use client';

import * as React from 'react';
import Image from 'next/image';
import { Lock, Eye, EyeSlash } from '@phosphor-icons/react';
import { Button, Card, CardContent, Input } from '@/components/ui';

export default function LoginPage() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); return; }
      window.location.href = '/growth';
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
      <Card className="bg-white w-full max-w-md shadow-xl rounded-2xl">
        <CardContent className="p-8">
          <div className="flex justify-center mb-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900 mb-1">RECTOVERSO</div>
              <div className="text-sm font-medium text-brand-600 tracking-widest uppercase">Growth Intelligence</div>
            </div>
          </div>

          <h1 className="text-xl font-bold text-center text-slate-900 mb-1">Welcome Back</h1>
          <p className="text-sm text-slate-500 text-center mb-8">Sign in to access the platform</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Email"
              id="email"
              type="email"
              placeholder="admin@rectoverso.id"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              leftElement={<Lock size={16} />}
            />
            <div className="relative">
              <Input
                label="Password"
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                rightElement={
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="hover:text-slate-600 transition-colors">
                    {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                {error}
              </div>
            )}

            <Button type="submit" isLoading={isLoading} className="w-full">
              Sign In
            </Button>
          </form>

          <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1">
              <Lock size={12} /> Demo Credentials
            </p>
            <div className="space-y-1 text-xs text-slate-600">
              <p><span className="font-medium">Super Admin:</span> admin@rectoverso.id / Admin123!</p>
              <p><span className="font-medium">Campaign Manager:</span> manager@rectoverso.id / Manager123!</p>
              <p><span className="font-medium">Client Viewer:</span> viewer@rectoverso.id / Viewer123!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
