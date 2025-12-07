import { useState, useEffect } from 'react';
import AddTargetForm from './components/AddTargetForm';
import TargetCard from './components/TargetCard';
import { targetsAPI } from './services/api';

function App() {
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const loadTargets = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await targetsAPI.getAll();
      const targetsData = response.data;

      // Load latest check for each target
      const targetsWithChecks = await Promise.all(
        targetsData.map(async (target) => {
          try {
            const checkResponse = await targetsAPI.getLatestCheck(target.id);
            return { ...target, latestCheck: checkResponse.data };
          } catch (err) {
            // If no checks yet, just return target without latest check
            return target;
          }
        })
      );

      setTargets(targetsWithChecks);
    } catch (err) {
      setError('Failed to load targets: ' + (err.response?.data?.detail || err.message));
      console.error('Error loading targets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTargets();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    // Refresh targets every 30 seconds when auto-refresh is enabled
    const interval = setInterval(loadTargets, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleAddTarget = async (targetData) => {
    try {
      setError(null);
      await targetsAPI.create(targetData);
      await loadTargets();
    } catch (err) {
      setError('Failed to add target: ' + (err.response?.data?.detail || err.message));
      console.error('Error adding target:', err);
    }
  };

  const handleDeleteTarget = async (targetId) => {
    try {
      setError(null);
      await targetsAPI.delete(targetId);
      await loadTargets();
    } catch (err) {
      setError('Failed to delete target: ' + (err.response?.data?.detail || err.message));
      console.error('Error deleting target:', err);
    }
  };

  const handleUpdateTarget = async (targetId, targetData) => {
    try {
      setError(null);
      await targetsAPI.update(targetId, targetData);
      await loadTargets();
    } catch (err) {
      setError('Failed to update target: ' + (err.response?.data?.detail || err.message));
      console.error('Error updating target:', err);
      throw err; // Re-throw so TargetCard can handle it
    }
  };

  return (
    <>
      <div className="header">
        <div className="container">
          <h1>Watcher Dashboard</h1>
        </div>
      </div>

      <div className="container">
        {error && (
          <div className="error-message">
            {error}
            <button
              style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => setError(null)}
            >
              ✕
            </button>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span>Auto-refresh every 30s</span>
            </label>
          </div>
          <button
            className="btn btn-secondary btn-small"
            onClick={loadTargets}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Now'}
          </button>
        </div>

        <AddTargetForm onTargetAdded={handleAddTarget} />

        {loading ? (
          <div className="loading">Loading targets...</div>
        ) : targets.length === 0 ? (
          <div className="empty-state">
            <h3>No targets yet</h3>
            <p>Add a target above to start monitoring websites</p>
          </div>
        ) : (
          <div className="targets-list">
            {targets.map((target) => (
              <TargetCard
                key={target.id}
                target={target}
                onDelete={handleDeleteTarget}
                onUpdate={handleUpdateTarget}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default App;