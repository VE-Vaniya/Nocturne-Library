import { useApp } from '../context/AppContext.jsx';
import * as api from '../services/api.js';
import Avatar from '../components/ui/Avatar.jsx';
import Button from '../components/ui/Button.jsx';
import { SEALS, SEAL_KEYS, sealBg } from '../components/ui/seals.js';
import FriendsModal from './profile/FriendsModal.jsx';
import EditProfile from './profile/EditProfile.jsx';

const serif = "'IM Fell English',Georgia,serif";

function readingSince(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  const month = d.toLocaleDateString('en-GB', { month: 'long' });
  return d.getFullYear() === new Date().getFullYear() ? month : `${month} ${d.getFullYear()}`;
}

const statBtn = {
  background: 'none',
  border: 0,
  borderRadius: 8,
  padding: '8px 0',
  color: '#e8dcc0',
  cursor: 'pointer',
};
const statNum = { display: 'block', fontFamily: serif, fontWeight: 400, fontSize: 34, lineHeight: 1 };

export default function Profile() {
  const { user, setUser, stats, books, quotes, friends, go, toast, openModal, signOut } = useApp();
  const name = user?.fullName || user?.username || '';
  const seal = SEALS[user?.sealColor] ? user.sealColor : 'oxblood';
  const since = readingSince(user?.createdAt);

  const bookCount = stats?.books ?? books.length;
  const quoteCount = stats?.quotes ?? quotes.length;
  const friendCount = stats?.friends ?? friends.length;

  const pickSeal = async (key) => {
    if (key === seal) return;
    const prev = user?.sealColor;
    setUser((u) => (u ? { ...u, sealColor: key } : u));
    try {
      await api.updateMe({ sealColor: key });
    } catch (err) {
      setUser((u) => (u ? { ...u, sealColor: prev } : u));
      toast(api.errorMessage(err, 'Could not change your seal'));
    }
  };

  const onSealKey = (e) => {
    const i = SEAL_KEYS.indexOf(seal);
    let next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = SEAL_KEYS[(i + 1) % SEAL_KEYS.length];
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = SEAL_KEYS[(i - 1 + SEAL_KEYS.length) % SEAL_KEYS.length];
    if (!next) return;
    e.preventDefault();
    pickSeal(next);
    const btn = e.currentTarget.querySelector(`[data-seal="${next}"]`);
    if (btn) btn.focus();
  };

  return (
    <div
      className="nl-prof"
      style={{ maxWidth: 920, margin: '0 auto', padding: '44px 32px 20px', display: 'grid', justifyItems: 'center', textAlign: 'center' }}
    >
      <Avatar
        className="nl-p-av"
        src={user?.avatar}
        name={name}
        seal={seal}
        size={108}
        alt={user?.avatar ? 'Your profile photo' : ''}
        style={{ fontSize: 48, boxShadow: '0 0 0 1px #c8a050,0 0 0 8px #0d1210,0 0 0 9px rgba(200,160,80,.4)' }}
      />

      <div className="nl-p-name" style={{ minWidth: 0, maxWidth: '100%' }}>
        <h1 style={{ margin: 0, fontFamily: serif, fontWeight: 400, fontSize: 46, lineHeight: 1, overflowWrap: 'anywhere' }}>{name}</h1>
        <p style={{ margin: '6px 0 0', color: '#a89f88' }}>
          @{user?.username || ''}
          {since ? ` · reading since ${since}` : ''}
        </p>
        {user?.bio ? (
          <p style={{ margin: '10px auto 0', maxWidth: '40ch', color: '#c9bd9f', fontStyle: 'italic', overflowWrap: 'anywhere' }}>{user.bio}</p>
        ) : null}
      </div>

      <div
        className="nl-p-stats"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
          gap: 12,
          width: '100%',
          borderTop: '1px solid rgba(200,160,80,.2)',
          borderBottom: '1px solid rgba(200,160,80,.2)',
          padding: '12px 0',
        }}
      >
        <button type="button" className="nl-row" style={statBtn} onClick={() => go('shelves')}>
          <b style={statNum}>{bookCount}</b>
          <span style={{ color: '#a89f88' }}>{bookCount === 1 ? 'book' : 'books'}</span>
        </button>
        <button type="button" className="nl-row" style={statBtn} onClick={() => go('quotes')}>
          <b style={statNum}>{quoteCount}</b>
          <span style={{ color: '#a89f88' }}>{quoteCount === 1 ? 'quote' : 'quotes'}</span>
        </button>
        <button type="button" className="nl-row" style={statBtn} onClick={() => openModal(<FriendsModal />)} aria-haspopup="dialog">
          <b style={statNum}>{friendCount}</b>
          <span style={{ color: '#a89f88' }}>{friendCount === 1 ? 'friend' : 'friends'}</span>
        </button>
      </div>

      <Button className="nl-p-edit" onClick={() => openModal(<EditProfile />)} aria-haspopup="dialog" style={{ padding: '0 26px' }}>
        Edit profile
      </Button>

      <div className="nl-p-seal">
        <p id="nl-seal-label" style={{ margin: '0 0 12px', color: '#a89f88' }}>
          Seal colour
        </p>
        <div role="radiogroup" aria-labelledby="nl-seal-label" onKeyDown={onSealKey} style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
          {SEAL_KEYS.map((k) => {
            const on = k === seal;
            return (
              <button
                key={k}
                type="button"
                role="radio"
                data-seal={k}
                aria-checked={on}
                aria-label={SEALS[k][0]}
                tabIndex={on ? 0 : -1}
                onClick={() => pickSeal(k)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  background: sealBg(k),
                  border: `2px solid ${on ? '#e9c779' : 'transparent'}`,
                  transition: 'border-color .3s',
                }}
              />
            );
          })}
        </div>
      </div>

      <Button variant="ghost" className="nl-p-out" onClick={signOut}>
        Sign out
      </Button>
    </div>
  );
}
