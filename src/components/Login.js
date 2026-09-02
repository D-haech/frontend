import React, { useState } from 'react';
import API from '../services/api';

function Login({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!username || !password) {
      setError('Please enter both username and password');
      setLoading(false);
      return;
    }

    try {
      const response = await API.post('token/', {
        username,
        password
      });

      if (response.data.access) {
        localStorage.setItem('access_token', response.data.access);
        localStorage.setItem('refresh_token', response.data.refresh);
        
        setUsername('');
        setPassword('');
        setLoading(false);
        onLogin();
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.response?.data?.detail || 'Invalid username or password');
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!username || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await API.post('register/', {
        username,
        password,
        email: email || ''
      });

      if (response.data) {
        setSuccess('Account created successfully! Please login.');
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        setEmail('');
        setLoading(false);
        setTimeout(() => {
          setIsLogin(true);
          setSuccess('');
        }, 2000);
      }
    } catch (error) {
      console.error('Signup error:', error);
      if (error.response?.data?.username) {
        setError('Username already exists. Please choose another.');
      } else if (error.response?.data?.password) {
        setError('Password: ' + error.response.data.password.join(', '));
      } else {
        setError(error.response?.data?.detail || 'Error creating account. Please try again.');
      }
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccess('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setEmail('');
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>💰 Business Tracker</h1>
          <p className="login-subtitle">
            {isLogin ? 'Sign in to your account' : 'Create a new account'}
          </p>
        </div>

        {error && (
          <div className="login-error">
            ❌ {error}
            <button onClick={() => setError('')} className="close-error">×</button>
          </div>
        )}

        {success && (
          <div className="login-success">
            ✅ {success}
          </div>
        )}

        <form onSubmit={isLogin ? handleLogin : handleSignup} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="email">Email (optional)</label>
              <input
                id="email"
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">
              {isLogin ? 'Password' : 'Password (min 6 characters)'}
            </label>
            <input
              id="password"
              type="password"
              placeholder={isLogin ? 'Enter your password' : 'Choose a strong password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          )}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? '⏳ Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="login-toggle">
          <button onClick={toggleMode} className="toggle-btn">
            {isLogin 
              ? "Don't have an account? Sign Up" 
              : "Already have an account? Sign In"}
          </button>
        </div>

        {isLogin && (
          <div className="login-footer">
            <p>Demo credentials: admin / admin123</p>
            <p className="login-hint">(Create a superuser with: python manage.py createsuperuser)</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;