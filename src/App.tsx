import { useYNAB } from './contexts/YNABContext';
import { FiltersProvider } from './contexts/FiltersContext';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';

function AppContent() {
  const { isAuthenticated, isLoading } = useYNAB();

  if (isLoading && !isAuthenticated) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-base)' }}>
        <div className="spinner" style={{ width: '48px', height: '48px' }}></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <FiltersProvider>
      <Dashboard />
    </FiltersProvider>
  );
}

function App() {
  return <AppContent />;
}

export default App;
