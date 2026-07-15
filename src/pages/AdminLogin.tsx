import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        navigate('/admin');
      } else {
        setError('Credenciais inválidas');
      }
    } catch (err) {
      setError('Erro ao fazer login');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-5">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-sm">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>
        <h1 className="text-2xl font-serif text-primary text-center mb-6">Login Administrativo</h1>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Usuário</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-border bg-background focus:outline-none focus:border-primary"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-border bg-background focus:outline-none focus:border-primary"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold shadow-sm hover:opacity-90 transition-opacity mt-2"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
