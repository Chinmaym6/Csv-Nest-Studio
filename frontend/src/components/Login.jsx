import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import './Auth.css';

export default function Login() {
  const [email, setEmail]     = useState('');
  const [password, setPass]   = useState('');
  const [error, setError]     = useState('');
  const { login }             = useAuth();
  const { addToast }          = useToast();
  const nav                   = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      addToast('Logged in!', 'success');
      nav('/dashboard');
    } catch (err) {
      setError(
        err.response?.status === 401
          ? 'Wrong email or password'
          : 'Something went wrong'
      );
    }
  };

  return (
    <div className="auth-hero">
      <div className="overlay" />
      <div className="auth-card">
        <h2>Welcome Back</h2>
        <p className="subtitle">Log in to your CSV File Manager</p>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <input
            className="input-field"
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            className="input-field"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPass(e.target.value)}
            required
          />
          <button className="btn btn-login" type="submit">
            Log In
          </button>
        </form>
        <p className="switch">
          Don’t have an account?{' '}
          <Link to="/signup" className="link-signup">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
