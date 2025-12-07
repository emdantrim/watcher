import { useState } from 'react';

export default function AddTargetForm({ onTargetAdded }) {
  const [formData, setFormData] = useState({
    url: '',
    name: '',
    check_interval_seconds: 300,
    enabled: true,
  });
  const [isVisible, setIsVisible] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    onTargetAdded(formData);
    setFormData({
      url: '',
      name: '',
      check_interval_seconds: 300,
      enabled: true,
    });
    setIsVisible(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  if (!isVisible) {
    return (
      <div className="add-target-form">
        <button className="btn btn-primary" onClick={() => setIsVisible(true)}>
          + Add New Target
        </button>
      </div>
    );
  }

  return (
    <div className="add-target-form">
      <h2>Add New Watch Target</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="url">URL *</label>
          <input
            type="url"
            id="url"
            name="url"
            value={formData.url}
            onChange={handleChange}
            placeholder="https://example.com"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="name">Name (optional)</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="My Website"
          />
        </div>

        <div className="form-group">
          <label htmlFor="check_interval_seconds">Check Interval (seconds)</label>
          <input
            type="number"
            id="check_interval_seconds"
            name="check_interval_seconds"
            value={formData.check_interval_seconds}
            onChange={handleChange}
            min="30"
            required
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            Add Target
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsVisible(false)}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}