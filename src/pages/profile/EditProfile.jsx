import { useId, useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import * as api from '../../services/api.js';
import Modal from '../../components/ui/Modal.jsx';
import Avatar from '../../components/ui/Avatar.jsx';
import Button from '../../components/ui/Button.jsx';
import { resizeImage } from './resizeImage.js';

const MIN_PW = 8;

/** Edit-profile sheet: photo (resized ≤512px JPEG data URL), name, username, bio, change password. */
export default function EditProfile() {
  const { user, setUser, closeModal, toast } = useApp();
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const fid = (k) => `nl-e-${k}-${uid}`;
  const [draft, setDraft] = useState(() => ({
    fullName: user?.fullName || '',
    username: user?.username || '',
    bio: user?.bio || '',
    avatar: user?.avatar || '',
  }));
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const pickPhoto = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setPhotoBusy(true);
    try {
      set('avatar', await resizeImage(file, 512));
    } catch (err) {
      toast(err?.message || 'That image could not be used');
    } finally {
      setPhotoBusy(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    if (busy) return;
    const fullName = draft.fullName.trim();
    const username = draft.username.trim();
    if (!fullName || !username) {
      toast('Name and username can’t be empty');
      return;
    }
    const wantsPw = pwOpen && (pw.current || pw.next || pw.confirm);
    if (wantsPw) {
      if (!pw.current) return toast('Enter your current password');
      if (pw.next.length < MIN_PW) return toast(`New password needs at least ${MIN_PW} characters`);
      if (pw.next !== pw.confirm) return toast('The new passwords don’t match');
      if (pw.next === pw.current) return toast('Choose a password different from the current one');
    }

    const changes = {};
    if (fullName !== (user?.fullName || '')) changes.fullName = fullName;
    if (username !== (user?.username || '')) changes.username = username;
    if (draft.bio !== (user?.bio || '')) changes.bio = draft.bio;
    if (draft.avatar !== (user?.avatar || '')) changes.avatar = draft.avatar;

    setBusy(true);
    try {
      if (Object.keys(changes).length) {
        const updated = await api.updateMe(changes);
        setUser((u) => ({ ...u, ...changes, ...(updated && typeof updated === 'object' ? updated : {}) }));
      }
      if (wantsPw) {
        try {
          await api.changePassword({ currentPassword: pw.current, newPassword: pw.next });
        } catch (err) {
          toast(api.errorMessage(err, 'Your password could not be changed'));
          setBusy(false);
          return;
        }
      }
      closeModal();
      toast(wantsPw ? 'Profile and password updated' : 'Profile updated');
    } catch (err) {
      toast(api.errorMessage(err, 'Your profile could not be saved'));
      setBusy(false);
    }
  };

  const label = { color: '#a89f88', fontSize: 14 };

  return (
    <Modal as="form" label="Edit profile" title="Edit profile" onSubmit={save} noValidate>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <Avatar src={draft.avatar} name={draft.fullName || user?.fullName} seal={user?.sealColor} size={76} style={{ fontSize: 32 }} />
        <div style={{ display: 'grid', gap: 6 }}>
          <span className="nl-file" style={{ position: 'relative' }}>
            <input
              id={fid('photo')}
              type="file"
              accept="image/*"
              onChange={pickPhoto}
              style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
            />
            <label
              htmlFor={fid('photo')}
              className="nl-ghost nl-file-label"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                minHeight: 38,
                padding: '0 14px',
                border: '1px solid rgba(200,160,80,.45)',
                borderRadius: 999,
                color: '#e8dcc0',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {photoBusy ? 'Preparing…' : 'Upload a photo'}
            </label>
          </span>
          {draft.avatar ? (
            <button
              type="button"
              onClick={() => set('avatar', '')}
              style={{ justifySelf: 'start', background: 'none', border: 0, color: '#a89f88', fontSize: 14, textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
            >
              Remove photo
            </button>
          ) : null}
        </div>
      </div>

      <div className="nl-field">
        <label htmlFor={fid('name')} style={label}>Name</label>
        <input id={fid('name')} className="nl-in nl-input" value={draft.fullName} onChange={(e) => set('fullName', e.target.value)} autoComplete="name" maxLength={80} data-autofocus />
      </div>
      <div className="nl-field">
        <label htmlFor={fid('handle')} style={label}>Username</label>
        <input
          id={fid('handle')}
          className="nl-in nl-input"
          value={draft.username}
          onChange={(e) => set('username', e.target.value.replace(/[^a-z0-9_.]/gi, '').toLowerCase())}
          autoComplete="username"
          maxLength={30}
        />
      </div>
      <div className="nl-field">
        <label htmlFor={fid('bio')} style={label}>Bio</label>
        <textarea id={fid('bio')} className="nl-in nl-input" rows={2} value={draft.bio} onChange={(e) => set('bio', e.target.value.slice(0, 140))} />
      </div>

      <button type="button" className="nl-linkbtn" onClick={() => setPwOpen((o) => !o)} aria-expanded={pwOpen} aria-controls={fid('pw')}>
        {pwOpen ? 'Keep my current password' : 'Change password'}
      </button>
      <div id={fid('pw')} className="nl-fold" style={{ gridTemplateRows: pwOpen ? '1fr' : '0fr', opacity: pwOpen ? 1 : 0 }} inert={!pwOpen}>
        <div style={{ overflow: 'hidden', display: 'grid', gap: 12 }}>
          <div className="nl-field">
            <label htmlFor={fid('pw0')} style={label}>Current password</label>
            <input id={fid('pw0')} className="nl-in nl-input" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} style={{ fontSize: 17 }} />
          </div>
          <div className="nl-field">
            <label htmlFor={fid('pw1')} style={label}>New password</label>
            <input id={fid('pw1')} className="nl-in nl-input" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} style={{ fontSize: 17 }} />
          </div>
          <div className="nl-field">
            <label htmlFor={fid('pw2')} style={label}>Confirm new password</label>
            <input id={fid('pw2')} className="nl-in nl-input" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} style={{ fontSize: 17 }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={closeModal} style={{ fontSize: 15, padding: '0 20px' }}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy || photoBusy} style={{ fontSize: 15 }}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </Modal>
  );
}
