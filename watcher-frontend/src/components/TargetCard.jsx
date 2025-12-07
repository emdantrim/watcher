import { useState } from 'react';
import { targetsAPI } from '../services/api';

export default function TargetCard({ target, onDelete, onUpdate }) {
  const [checks, setChecks] = useState([]);
  const [showChecks, setShowChecks] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    url: target.url,
    name: target.name || '',
    check_interval_seconds: target.check_interval_seconds,
    enabled: target.enabled,
  });

  const loadChecks = async () => {
    if (showChecks) {
      setShowChecks(false);
      return;
    }

    setLoading(true);
    try {
      const response = await targetsAPI.getChecks(target.id, 20);
      setChecks(response.data);
      setShowChecks(true);
    } catch (error) {
      console.error('Failed to load checks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${target.name || target.url}"?`)) {
      onDelete(target.id);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditForm({
      url: target.url,
      name: target.name || '',
      check_interval_seconds: target.check_interval_seconds,
      enabled: target.enabled,
    });
    setIsEditing(false);
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      await onUpdate(target.id, editForm);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update target:', error);
      alert('Failed to update target: ' + (error.response?.data?.detail || error.message));
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatDuration = (ms) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatBytes = (bytes) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatHash = (hash) => {
    if (!hash) return 'N/A';
    // Show first 8 and last 8 characters of hash
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
  };

  const getLatestCheck = () => {
    // Use the latestCheck from props if available
    if (target.latestCheck) return target.latestCheck;
    // Otherwise fall back to the first item in checks array
    return checks.length > 0 ? checks[0] : null;
  };

  const latestCheck = getLatestCheck();

  if (isEditing) {
    return (
      <div className="target-card">
        <form onSubmit={handleSaveEdit}>
          <h3>Edit Target</h3>

          <div className="form-group">
            <label htmlFor={`edit-url-${target.id}`}>URL *</label>
            <input
              type="url"
              id={`edit-url-${target.id}`}
              name="url"
              value={editForm.url}
              onChange={handleEditChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor={`edit-name-${target.id}`}>Name</label>
            <input
              type="text"
              id={`edit-name-${target.id}`}
              name="name"
              value={editForm.name}
              onChange={handleEditChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor={`edit-interval-${target.id}`}>Check Interval (seconds)</label>
            <input
              type="number"
              id={`edit-interval-${target.id}`}
              name="check_interval_seconds"
              value={editForm.check_interval_seconds}
              onChange={handleEditChange}
              min="30"
              required
            />
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                name="enabled"
                checked={editForm.enabled}
                onChange={handleEditChange}
              />
              {' '}Enabled
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Save Changes
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleCancelEdit}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="target-card">
      <div className="target-header">
        <div className="target-info">
          <h3>{target.name || 'Unnamed Target'}</h3>
          <a
            href={target.url}
            target="_blank"
            rel="noopener noreferrer"
            className="target-url"
          >
            {target.url}
          </a>
        </div>
        <div className="target-actions">
          <button className="btn btn-primary btn-small" onClick={handleEdit}>
            Edit
          </button>
          <button className="btn btn-danger btn-small" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      <div className="target-meta">
        <div className="meta-item">
          <span className="meta-label">Status</span>
          <span className="meta-value">
            <span className={`status-badge ${target.enabled ? 'status-enabled' : 'status-disabled'}`}>
              {target.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </span>
        </div>

        <div className="meta-item">
          <span className="meta-label">Check Interval</span>
          <span className="meta-value">{target.check_interval_seconds}s</span>
        </div>

        {latestCheck && (
          <>
            <div className="meta-item">
              <span className="meta-label">Last Status</span>
              <span className="meta-value">
                <span className={`status-badge ${latestCheck.is_success ? 'status-success' : 'status-error'}`}>
                  {latestCheck.status_code || 'Error'}
                </span>
              </span>
            </div>

            <div className="meta-item">
              <span className="meta-label">Response Time</span>
              <span className="meta-value">
                {latestCheck.response_time_ms ? formatDuration(latestCheck.response_time_ms) : 'N/A'}
              </span>
            </div>

            <div className="meta-item">
              <span className="meta-label">Last Checked</span>
              <span className="meta-value">{formatDate(latestCheck.checked_at)}</span>
            </div>

            {latestCheck.content_length !== null && latestCheck.content_length !== undefined && (
              <div className="meta-item">
                <span className="meta-label">Content Size</span>
                <span className="meta-value">{formatBytes(latestCheck.content_length)}</span>
              </div>
            )}

            {latestCheck.content_hash && (
              <div className="meta-item">
                <span className="meta-label">Content Hash</span>
                <span className="meta-value">
                  <code style={{ fontSize: '0.85em' }}>{formatHash(latestCheck.content_hash)}</code>
                </span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="checks-section">
        <div className="checks-header">
          <h4>Recent Checks ({checks.length})</h4>
          <button className="toggle-checks" onClick={loadChecks} disabled={loading}>
            {loading ? 'Loading...' : showChecks ? 'Hide' : 'Show'}
          </button>
        </div>

        {showChecks && (
          <div className="checks-list">
            {checks.length === 0 ? (
              <div className="empty-state">No checks yet</div>
            ) : (
              checks.map((check) => (
                <div
                  key={check.id}
                  className={`check-item ${check.content_changed ? 'changed' : ''} ${check.is_success ? 'success' : 'error'}`}
                >
                  <div className="check-time">{formatDate(check.checked_at)}</div>
                  <div className="check-details">
                    <div className="check-detail">
                      <strong>Status:</strong> {check.status_code || 'Error'}
                    </div>
                    {check.response_time_ms && (
                      <div className="check-detail">
                        <strong>Time:</strong> {formatDuration(check.response_time_ms)}
                      </div>
                    )}
                    {check.content_length !== null && check.content_length !== undefined && (
                      <div className="check-detail">
                        <strong>Size:</strong> {formatBytes(check.content_length)}
                      </div>
                    )}
                    {check.content_hash && (
                      <div className="check-detail">
                        <strong>Hash:</strong> <code style={{ fontSize: '0.85em' }}>{formatHash(check.content_hash)}</code>
                      </div>
                    )}
                    {check.content_changed && (
                      <div className="check-detail">
                        <strong style={{ color: '#f39c12' }}>⚠ Content Changed</strong>
                      </div>
                    )}
                    {check.error_message && (
                      <div className="check-detail">
                        <strong>Error:</strong> {check.error_message}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}