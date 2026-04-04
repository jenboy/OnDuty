'use client';

import { useState, useEffect, useRef } from 'react';
import { storage } from '@/lib/storage';
import { Lock, Shield, AlertCircle, CheckCircle, Key } from 'lucide-react';

interface AuthPageProps {
  onAuthSuccess: () => void;
}

// Confetti animation function
function fireConfetti() {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 }
  };

  function fire(particleRatio: number, opts: any) {
    const confetti = (window as any).confetti;
    if (confetti) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });
  fire(0.2, {
    spread: 60,
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
}

export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const scriptLoaded = useRef(false);

  // Load confetti script
  useEffect(() => {
    if (!scriptLoaded.current) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js';
      script.async = true;
      document.body.appendChild(script);
      scriptLoaded.current = true;
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);

    try {
      // 尝试登录
      const loginResult = storage.login(password);
      if (loginResult) {
        // 登录成功
        setMessage('登录成功！');
        setIsSuccess(true);
        fireConfetti();
        setTimeout(() => {
          onAuthSuccess();
        }, 1000);
      } else {
        // 登录失败，自动注册
        const registerResult = storage.register(password);
        if (registerResult) {
          setMessage('密码未注册，已自动为您注册并登录！');
          setIsSuccess(true);
          fireConfetti();
          setTimeout(() => {
            onAuthSuccess();
          }, 1000);
        } else {
          setMessage('操作失败，请重试');
          setIsSuccess(false);
        }
      }
    } catch (err) {
      setMessage('操作失败，请重试');
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Shield className="mx-auto h-16 w-16 text-blue-600 mb-4" />
          <h2 className="text-3xl font-extrabold text-gray-900">
            OnDuty
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            值日排班系统
          </p>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-md space-y-6">
          <div className="text-center mb-2">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center justify-center gap-2">
              <Key className="w-5 h-5 text-blue-600" />
              访问系统
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              输入密码即可访问，未注册的密码会自动注册
            </p>
          </div>

          {message && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              isSuccess
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              {isSuccess ? (
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              )}
              <span className={`text-sm ${
                isSuccess ? 'text-green-700' : 'text-red-700'
              }`}>
                {message}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                密码
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="请输入密码"
                  required
                  minLength={3}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                密码长度至少3位，是访问您专属数据区的唯一凭证
              </p>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  '登录 / 注册'
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>每个密码对应一个独立的数据区</p>
          <p className="mt-1">请妥善保管您的密码，丢失后无法恢复</p>
        </div>
      </div>
    </div>
  );
}
