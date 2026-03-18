import React, { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { userStore, authLoadingStore, initAuth } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { LogIn, LogOut, User, X } from 'lucide-react';
import './AuthWidget.css';
import { useTranslation } from '../../hooks/useTranslation';

const AuthWidget = () => {
  const user = useStore(userStore);
  const loading = useStore(authLoadingStore);
  const { t } = useTranslation();
  
  const [showModal, setShowModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    initAuth();
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert("¡Revisa tu correo electrónico para confirmar la cuenta!");
      }
      setShowModal(false);
    } catch (err) {
      if (err.message.includes('Invalid login credentials')) {
        setError('Credenciales inválidas');
      } else if (err.message.includes('User already registered')) {
        setError('El correo ya está registrado');
      } else {
        setError(err.message);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleGoogleAuth = async () => {
    setProcessing(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      if (error) throw error;
      // No cerramos el modal porque hay redirección a Google
    } catch (err) {
      setError(err.message);
      setProcessing(false);
    }
  };

  if (loading) return <div className="auth-widget-loading"></div>;

  return (
    <>
      <div className="auth-widget">
        {user ? (
          <div className="auth-user-menu">
            <span className="user-email" title={user.email}>
              <User size={18} />
              <span className="email-text">{user.email.split('@')[0]}</span>
            </span>
            <button onClick={handleLogout} className="auth-btn logout-btn" title="Cerrar sesión">
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <button onClick={() => setShowModal(true)} className="auth-btn login-btn">
            <LogIn size={18} />
            <span className="login-text">Login</span>
          </button>
        )}
      </div>

      {showModal && (
        <div className="auth-modal-overlay">
          <div className="auth-modal">
            <button className="close-btn" onClick={() => setShowModal(false)}>
              <X size={20} />
            </button>
            <h2>{isLogin ? 'Iniciar Sesión' : 'Registrarse'}</h2>
            
            <button 
              type="button" 
              className="google-auth-btn" 
              onClick={handleGoogleAuth}
              disabled={processing}
            >
              <svg className="google-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20px" height="20px">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
              </svg>
              Continuar con Google
            </button>
            
            <div className="auth-divider">
              <span>{isLogin ? 'o usa tu correo' : 'o regístrate con correo'}</span>
            </div>

            <form onSubmit={handleAuth}>
              <div className="form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Contraseña</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
              </div>
              
              {error && <div className="error-message">{error}</div>}
              
              <button 
                type="submit" 
                className="submit-btn" 
                disabled={processing}
              >
                {processing ? '...' : (isLogin ? 'Entrar' : 'Crear Cuenta')}
              </button>
            </form>
            
            <div className="auth-switch">
              {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
              <button type="button" onClick={() => setIsLogin(!isLogin)}>
                {isLogin ? 'Regístrate' : 'Inicia Sesión'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AuthWidget;
