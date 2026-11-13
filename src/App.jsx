import { AppProvider } from './context/AppContext.jsx';
import Shell from './components/shell/Shell.jsx';

// Pages are discovered with a glob so this shell builds even before every page
// file has landed (Shelves/Find/Quotes/Timer are built on a parallel branch).
const modules = import.meta.glob('./pages/*.jsx', { eager: true });

function Missing({ label }) {
  return <div className="nl-missing">{label} is still being bound.</div>;
}

const DEFS = [
  { name: 'home', label: 'Home', aria: 'Home', file: 'Home' },
  { name: 'shelves', label: 'Shelves', aria: 'Shelves', file: 'Shelves' },
  { name: 'find', label: 'Find', aria: 'Find', file: 'Find' },
  { name: 'quotes', label: 'Quotes', aria: 'Quotes', file: 'Quotes' },
  { name: 'timer', label: 'Timer', aria: 'Reading timer', file: 'Timer' },
  { name: 'profile', label: 'Profile', aria: 'Profile', file: 'Profile' },
];

const PAGES = DEFS.map((d) => {
  const mod = modules[`./pages/${d.file}.jsx`];
  const Component = mod?.default || (() => <Missing label={d.label} />);
  return { ...d, Component };
});

export default function App() {
  return (
    <AppProvider>
      <Shell pages={PAGES} />
    </AppProvider>
  );
}
