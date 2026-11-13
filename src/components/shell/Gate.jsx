import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import * as api from '../../services/api.js';

/** Sign-in / register gate; lifts away (translateY(-104%)) once signed in. */
export default function Gate() {
  const { user, signIn } = useApp();
  const open = !!user;
  const [register, setRegister] = useState(false);
  const [f, setF] = useState({ fullName: '', username: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => {
    let v = e.target.value;
    if (k === 'username') v = v.replace(/[^a-z0-9_.]/gi, '').toLowerCase();
    setF((x) => ({ ...x, [k]: v }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const email = f.email.trim();
    if (!email || !f.password) return setError('Email and password, please.');
    if (register) {
      if (!f.fullName.trim()) return setError('Tell us your name.');
      if (f.username.length < 3) return setError('Choose a username of at least 3 characters.');
      if (f.password.length < 8) return setError('Passwords need at least 8 characters.');
    }
    setBusy(true);
    setError('');
    try {
      const res = register
        ? await api.signup({ fullName: f.fullName.trim(), username: f.username, email, password: f.password })
        : await api.login({ email, password: f.password });
      setF({ fullName: '', username: '', email: '', password: '' });
      signIn(res);
    } catch (err) {
      setError(api.errorMessage(err, register ? 'Could not create your account.' : 'Could not sign you in.'));
    } finally {
      setBusy(false);
    }
  };

  const flip = () => {
    setRegister((r) => !r);
    setError('');
  };

  return (
    <div className={`nl-gate${open ? ' is-open' : ''}`} aria-hidden={open} inert={open}>
      <div className="nl-gate-glow" aria-hidden="true" />
      <div className="nl-gate-inner">
        <div>
          <h1 className="nl-gate-title">
            Nocturne
            <br />
            <i>Library</i>
          </h1>
          <p className="nl-gate-sub">Your books, your quotes, your reading friends.</p>
        </div>
        <form aria-label={register ? 'Create account' : 'Sign in'} onSubmit={submit} noValidate>
          <div className="nl-fold" style={{ gridTemplateRows: register ? '1fr' : '0fr', opacity: register ? 1 : 0 }} aria-hidden={!register} inert={!register}>
            <div style={{ overflow: 'hidden', display: 'grid', gap: 18 }}>
              <div className="nl-field">
                <label htmlFor="nl-name">Name</label>
                <input id="nl-name" className="nl-in nl-input" value={f.fullName} onChange={set('fullName')} autoComplete="name" />
              </div>
              <div className="nl-field">
                <label htmlFor="nl-uname">Username</label>
                <input id="nl-uname" className="nl-in nl-input" value={f.username} onChange={set('username')} autoComplete="username" />
              </div>
            </div>
          </div>
          <div className="nl-field">
            <label htmlFor="nl-email">Email</label>
            <input id="nl-email" className="nl-in nl-input" type="email" value={f.email} onChange={set('email')} autoComplete="email" />
          </div>
          <div className="nl-field">
            <label htmlFor="nl-pass">Password</label>
            <input
              id="nl-pass"
              className="nl-in nl-input"
              type="password"
              value={f.password}
              onChange={set('password')}
              autoComplete={register ? 'new-password' : 'current-password'}
            />
          </div>
          {error ? (
            <p className="nl-gate-error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="nl-btn nl-gate-cta" disabled={busy}>
            {busy ? 'One moment…' : register ? 'Create my account' : 'Enter the library'}
          </button>
          <button type="button" className="nl-gate-switch" onClick={flip}>
            {register ? 'I already have an account' : 'New here? Create an account'}
          </button>
        </form>
      </div>
    </div>
  );
}
