// ABOUTME: Settings component for managing user notification preferences
// ABOUTME: Allows users to configure email and in-app notification settings with granular control

import React, { useState, useEffect } from 'react';
import { NotificationPreferencesProps, NotificationPreferences } from '../../../types/reputation';
import { useNotificationPreferences } from '../../../hooks/useReputation';
import './NotificationPreferences.css';

export const NotificationPreferencesComponent: React.FC<NotificationPreferencesProps> = ({
  userId,
  onSaved
}) => {
  const { preferences, loading, error, updatePreferences } = useNotificationPreferences(userId);
  const [formData, setFormData] = useState<Partial<NotificationPreferences>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Update form data when preferences load
  useEffect(() => {
    if (preferences) {
      setFormData(preferences);
    }
  }, [preferences]);

  const handleBooleanChange = (field: keyof NotificationPreferences, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleSelectChange = (field: keyof NotificationPreferences, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(false);

      const success = await updatePreferences(formData);
      
      if (success) {
        setSaveSuccess(true);
        if (onSaved && preferences) {
          onSaved({ ...preferences, ...formData });
        }
        // Clear success message after 3 seconds
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError('Failed to save preferences. Please try again.');
      }
    } catch (err) {
      console.error('Error saving preferences:', err);
      setSaveError('An error occurred while saving preferences.');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    if (!preferences) return false;
    
    return Object.keys(formData).some(key => {
      const prefKey = key as keyof NotificationPreferences;
      return formData[prefKey] !== preferences[prefKey];
    });
  };

  if (loading) {
    return (
      <div className="notification-preferences">
        <div className="preferences-loading">
          <div className="loading-spinner"></div>
          <span>Loading notification preferences...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="notification-preferences">
        <div className="preferences-error">
          <span className="error-icon">⚠️</span>
          <span>Failed to load notification preferences</span>
        </div>
      </div>
    );
  }

  return (
    <div className="notification-preferences">
      <div className="preferences-header">
        <h2>Notification Preferences</h2>
        <p>Choose how you want to be notified about activity and updates</p>
      </div>

      {saveSuccess && (
        <div className="success-banner">
          <span className="success-icon">✅</span>
          <span>Preferences saved successfully!</span>
        </div>
      )}

      {saveError && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{saveError}</span>
        </div>
      )}

      <div className="preferences-content">
        <section className="preferences-section">
          <h3>Email Notifications</h3>
          <p className="section-description">
            Get notified via email when important events happen
          </p>

          <div className="preferences-grid">
            <div className="preference-item">
              <div className="preference-info">
                <label htmlFor="email_reviews">Review Activity</label>
                <span className="preference-description">
                  New comments on your reviews and review replies
                </span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  id="email_reviews"
                  checked={formData.email_reviews ?? true}
                  onChange={(e) => handleBooleanChange('email_reviews', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <label htmlFor="email_comments">Comment Activity</label>
                <span className="preference-description">
                  Replies to your comments and comment mentions
                </span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  id="email_comments"
                  checked={formData.email_comments ?? true}
                  onChange={(e) => handleBooleanChange('email_comments', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <label htmlFor="email_mentions">Mentions</label>
                <span className="preference-description">
                  When someone mentions you in a comment or review
                </span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  id="email_mentions"
                  checked={formData.email_mentions ?? true}
                  onChange={(e) => handleBooleanChange('email_mentions', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <label htmlFor="email_appeals">Appeal Updates</label>
                <span className="preference-description">
                  Updates on your moderation appeals
                </span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  id="email_appeals"
                  checked={formData.email_appeals ?? true}
                  onChange={(e) => handleBooleanChange('email_appeals', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <label htmlFor="email_moderation">Moderation Alerts</label>
                <span className="preference-description">
                  Warnings, content removal, and account actions
                </span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  id="email_moderation"
                  checked={formData.email_moderation ?? true}
                  onChange={(e) => handleBooleanChange('email_moderation', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <label htmlFor="email_system">System Updates</label>
                <span className="preference-description">
                  Important announcements and security alerts
                </span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  id="email_system"
                  checked={formData.email_system ?? true}
                  onChange={(e) => handleBooleanChange('email_system', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div className="email-frequency-section">
            <h4>Email Frequency</h4>
            <div className="frequency-options">
              <label className="radio-option">
                <input
                  type="radio"
                  name="email_frequency"
                  value="immediate"
                  checked={(formData.email_frequency ?? 'immediate') === 'immediate'}
                  onChange={(e) => handleSelectChange('email_frequency', e.target.value)}
                />
                <span className="radio-label">
                  <strong>Immediate</strong>
                  <span className="radio-description">Get emails as events happen</span>
                </span>
              </label>

              <label className="radio-option">
                <input
                  type="radio"
                  name="email_frequency"
                  value="daily"
                  checked={(formData.email_frequency ?? 'immediate') === 'daily'}
                  onChange={(e) => handleSelectChange('email_frequency', e.target.value)}
                />
                <span className="radio-label">
                  <strong>Daily Digest</strong>
                  <span className="radio-description">One email per day with all updates</span>
                </span>
              </label>

              <label className="radio-option">
                <input
                  type="radio"
                  name="email_frequency"
                  value="weekly"
                  checked={(formData.email_frequency ?? 'immediate') === 'weekly'}
                  onChange={(e) => handleSelectChange('email_frequency', e.target.value)}
                />
                <span className="radio-label">
                  <strong>Weekly Digest</strong>
                  <span className="radio-description">One email per week with all updates</span>
                </span>
              </label>

              <label className="radio-option">
                <input
                  type="radio"
                  name="email_frequency"
                  value="never"
                  checked={(formData.email_frequency ?? 'immediate') === 'never'}
                  onChange={(e) => handleSelectChange('email_frequency', e.target.value)}
                />
                <span className="radio-label">
                  <strong>Never</strong>
                  <span className="radio-description">Don't send any emails</span>
                </span>
              </label>
            </div>

            {(formData.email_frequency === 'daily' || formData.email_frequency === 'weekly') && (
              <div className="digest-timing">
                <div className="timing-row">
                  {formData.email_frequency === 'weekly' && (
                    <div className="timing-field">
                      <label htmlFor="digest_day">Day of Week</label>
                      <select
                        id="digest_day"
                        value={formData.digest_day_of_week ?? 1}
                        onChange={(e) => handleSelectChange('digest_day_of_week', parseInt(e.target.value))}
                      >
                        <option value={0}>Sunday</option>
                        <option value={1}>Monday</option>
                        <option value={2}>Tuesday</option>
                        <option value={3}>Wednesday</option>
                        <option value={4}>Thursday</option>
                        <option value={5}>Friday</option>
                        <option value={6}>Saturday</option>
                      </select>
                    </div>
                  )}
                  
                  <div className="timing-field">
                    <label htmlFor="digest_hour">Time of Day</label>
                    <select
                      id="digest_hour"
                      value={formData.digest_hour ?? 9}
                      onChange={(e) => handleSelectChange('digest_hour', parseInt(e.target.value))}
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="preferences-section">
          <h3>In-App Notifications</h3>
          <p className="section-description">
            Show notifications in the notification center
          </p>

          <div className="preferences-grid">
            <div className="preference-item">
              <div className="preference-info">
                <label htmlFor="inapp_reviews">Review Activity</label>
                <span className="preference-description">
                  New comments on your reviews and review replies
                </span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  id="inapp_reviews"
                  checked={formData.inapp_reviews ?? true}
                  onChange={(e) => handleBooleanChange('inapp_reviews', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <label htmlFor="inapp_comments">Comment Activity</label>
                <span className="preference-description">
                  Replies to your comments and comment mentions
                </span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  id="inapp_comments"
                  checked={formData.inapp_comments ?? true}
                  onChange={(e) => handleBooleanChange('inapp_comments', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <label htmlFor="inapp_mentions">Mentions</label>
                <span className="preference-description">
                  When someone mentions you in a comment or review
                </span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  id="inapp_mentions"
                  checked={formData.inapp_mentions ?? true}
                  onChange={(e) => handleBooleanChange('inapp_mentions', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <label htmlFor="inapp_appeals">Appeal Updates</label>
                <span className="preference-description">
                  Updates on your moderation appeals
                </span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  id="inapp_appeals"
                  checked={formData.inapp_appeals ?? true}
                  onChange={(e) => handleBooleanChange('inapp_appeals', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <label htmlFor="inapp_moderation">Moderation Alerts</label>
                <span className="preference-description">
                  Warnings, content removal, and account actions
                </span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  id="inapp_moderation"
                  checked={formData.inapp_moderation ?? true}
                  onChange={(e) => handleBooleanChange('inapp_moderation', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="preference-item">
              <div className="preference-info">
                <label htmlFor="inapp_system">System Updates</label>
                <span className="preference-description">
                  Important announcements and security alerts
                </span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  id="inapp_system"
                  checked={formData.inapp_system ?? true}
                  onChange={(e) => handleBooleanChange('inapp_system', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </section>
      </div>

      <div className="preferences-footer">
        <button
          className="save-button"
          onClick={handleSave}
          disabled={saving || !hasChanges()}
        >
          {saving ? (
            <>
              <span className="loading-spinner"></span>
              Saving...
            </>
          ) : (
            'Save Preferences'
          )}
        </button>
      </div>
    </div>
  );
};