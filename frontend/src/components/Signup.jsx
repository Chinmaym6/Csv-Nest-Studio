import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth }           from '../contexts/AuthContext';
import { useToast }          from '../contexts/ToastContext';
import './Auth.css';

export default function Signup() {
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [password, setPass]   = useState('');
  const [error, setError]     = useState('');
  const { signup }            = useAuth();
  const { addToast }          = useToast();
  const nav                   = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    try {
      await signup(name, email, password);
      addToast('Account created!', 'success');
      nav('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.error ||
        'Sign-up failed. Please try again.'
      );
    }
  };

  return (
    <div className="auth-hero">
      <div className="overlay" />
      <div className="auth-card">
        <h2>Create Account</h2>
        <p className="subtitle">Join CSV File Manager</p>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <input
            className="input-field"
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <input
            className="input-field"
            type="email"
            placeholder="Email Address"
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
            Sign Up
          </button>
        </form>
        <p className="switch">
          Already have an account?{' '}
          <Link to="/login" className="link-signup">Log In</Link>
        </p>
      </div>
    </div>
  );
}
