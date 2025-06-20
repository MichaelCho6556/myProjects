// ABOUTME: Privacy settings page for controlling user profile and activity visibility
// ABOUTME: Provides comprehensive privacy controls with form validation and user feedback

import React, { useState, useEffect } from 'react';
import { useCurrentUserProfile } from '../hooks/useUserProfile';
import { PrivacySettings } from '../types/social';
import LoadingBanner from '../components/Loading/LoadingBanner';
import ErrorFallback from '../components/Error/ErrorFallback';

export const PrivacySettingsPage: React.FC = () => {
  const { privacySettings, isLoading, error, updatePrivacySettings } = useCurrentUserProfile();
  const [formData, setFormData] = useState<PrivacySettings>({
    profileVisibility: 'Public',
    listVisibility: 'Public',
    activityVisibility: 'Public',
    showCompletionStats: true
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Update form when privacy settings are loaded
  useEffect(() => {
    if (privacySettings) {
      setFormData(privacySettings);
    }
  }, [privacySettings]);

  // Check for changes
  useEffect(() => {
    if (privacySettings) {
      const hasChanges = JSON.stringify(formData) !== JSON.stringify(privacySettings);
      setHasChanges(hasChanges);
    }
  }, [formData, privacySettings]);

  const handleVisibilityChange = (
    field: keyof PrivacySettings,
    value: string | boolean
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setSaveMessage(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);

    try {
      await updatePrivacySettings(formData);
      setSaveMessage('Privacy settings saved successfully!');
      setHasChanges(false);
    } catch (err) {
      setSaveMessage('Failed to save privacy settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (privacySettings) {
      setFormData(privacySettings);
      setSaveMessage(null);
    }
  };

  if (isLoading) {
    return <LoadingBanner message="Loading privacy settings..." isVisible={true} />;
  }

  if (error) {
    return <ErrorFallback error={error} />;
  }

  const visibilityOptions = [
    { value: 'Public', label: 'Public', description: 'Visible to everyone' },
    { value: 'Friends Only', label: 'Friends Only', description: 'Only visible to users you follow who also follow you' },
    { value: 'Private', label: 'Private', description: 'Only visible to you' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Privacy Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Control who can see your profile, lists, and activities
          </p>
        </div>

        {/* Settings Form */}
        <form onSubmit={handleSave} className="space-y-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            {/* Profile Visibility */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Profile Visibility
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Choose who can view your profile page and basic information
              </p>
              
              <div className="space-y-3">
                {visibilityOptions.map(option => (
                  <label
                    key={option.value}
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="profileVisibility"
                      value={option.value}
                      checked={formData.profileVisibility === option.value}
                      onChange={(e) => handleVisibilityChange('profileVisibility', e.target.value)}
                      className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {option.label}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {option.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* List Visibility */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                List Visibility
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Control who can see your anime and manga lists
              </p>
              
              <div className="space-y-3">
                {visibilityOptions.map(option => (
                  <label
                    key={option.value}
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="listVisibility"
                      value={option.value}
                      checked={formData.listVisibility === option.value}
                      onChange={(e) => handleVisibilityChange('listVisibility', e.target.value)}
                      className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {option.label}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {option.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Activity Visibility */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Activity Visibility
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Choose who can see your recent activities and updates
              </p>
              
              <div className="space-y-3">
                {visibilityOptions.map(option => (
                  <label
                    key={option.value}
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="activityVisibility"
                      value={option.value}
                      checked={formData.activityVisibility === option.value}
                      onChange={(e) => handleVisibilityChange('activityVisibility', e.target.value)}
                      className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {option.label}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {option.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Statistics Visibility */}
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Statistics Display
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Additional privacy controls for your profile statistics
              </p>
              
              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.showCompletionStats}
                  onChange={(e) => handleVisibilityChange('showCompletionStats', e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    Show Completion Statistics
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Display your completion counts, average ratings, and progress statistics on your profile
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Save Message */}
          {saveMessage && (
            <div className={`p-4 rounded-lg ${
              saveMessage.includes('success') 
                ? 'bg-green-50 border border-green-200 text-green-700 dark:bg-green-900/50 dark:border-green-800 dark:text-green-300'
                : 'bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/50 dark:border-red-800 dark:text-red-300'
            }`}>
              {saveMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            <button
              type="button"
              onClick={handleReset}
              disabled={!hasChanges || isSaving}
              className="
                px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300
                rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              Reset Changes
            </button>
            <button
              type="submit"
              disabled={!hasChanges || isSaving}
              className="
                px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              "
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>

        {/* Privacy Notice */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">Privacy Notice</p>
              <p>
                Your privacy settings take effect immediately. Note that some cached data may take a few minutes to update across the platform.
                You can change these settings at any time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};