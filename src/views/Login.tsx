import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/library';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error('Login error:', err);
      setError(
        err.message || 'Falha ao fazer login. Verifique suas credenciais.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error('Google login error:', err);
      setError(err.message || 'Falha ao fazer login com o Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in-up" style={{ minHeight: '100vh', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', padding: '40px 24px', fontFamily: 'var(--font-family)' }}>
      
      {/* Header Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px' }}>
        <div style={{
          backgroundColor: '#0f766e', color: '#ffffff', fontFamily: 'serif', fontSize: '24px', fontStyle: 'italic', 
          width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
          borderRadius: '8px', transform: 'rotate(-5deg)'
        }}>
          L
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f766e', fontFamily: 'serif', margin: 0 }}>
          Leitor Paralelo
        </h1>
      </div>

      <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
        
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #f3f4f6', marginBottom: '48px' }}>
          <Link
            to="/register"
            style={{ fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.05em', color: '#9ca3af', paddingBottom: '12px', paddingRight: '32px', textTransform: 'uppercase', textDecoration: 'none' }}
          >
            Registration
          </Link>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.05em', color: '#0f766e', paddingBottom: '12px', paddingRight: '32px', textTransform: 'uppercase', borderBottom: '4px solid #0f766e' }}>
            Sign In
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="animate-fade-in-up animate-delay-100" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {error && (
            <div style={{ backgroundColor: '#fef2f2', padding: '16px', borderRadius: '8px', color: '#b91c1c', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-auth"
              style={{ display: 'block', width: '100%', padding: '12px 0', color: '#111827', border: 'none', borderBottom: '2px solid #e5e7eb', outline: 'none', fontSize: '1.125rem', backgroundColor: 'transparent' }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-auth"
              style={{ display: 'block', width: '100%', padding: '12px 60px 12px 0', color: '#111827', border: 'none', borderBottom: '2px solid #e5e7eb', outline: 'none', fontSize: '1.125rem', backgroundColor: 'transparent' }}
            />
            <div style={{ position: 'absolute', top: '12px', right: 0 }}>
               <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#9ca3af', cursor: 'pointer' }}>Forgot?</span>
            </div>
          </div>

          <div style={{ paddingTop: '32px' }}>
            <button
              type="submit"
              disabled={loading}
              className="btn-auth-primary"
              style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '16px', border: 'none', borderRadius: '30px', fontSize: '1.125rem', fontWeight: 500, color: '#ffffff', backgroundColor: '#0f766e', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Entrando...' : 'Sign In'}
            </button>
          </div>
        </form>
        
        <div className="animate-fade-in-up animate-delay-200" style={{ marginTop: '48px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
           <p style={{ marginBottom: '24px', fontSize: '0.875rem', color: '#6b7280' }}>
             Ou entre com
           </p>
           <button 
             onClick={handleGoogleLogin} 
             disabled={loading}
             className="btn-auth-social"
             style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 24px', borderRadius: '24px', border: '1px solid #e5e7eb', backgroundColor: '#ffffff', color: '#374151', fontSize: '1rem', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
               <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
               <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
               <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
               <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
             </svg>
             Google
           </button>
           
           <p style={{ marginTop: '32px', fontSize: '0.75rem', color: '#6b7280' }}>
              By continuing you accept our <span style={{ color: '#3b82f6', cursor: 'pointer' }}>Privacy Policy</span>
           </p>
        </div>

      </div>
    </div>
  );
};
