// ABOUTME: Privacy settings page for controlling user profile and activity visibility
// ABOUTME: Provides comprehensive privacy controls with form validation and user feedback

import React, { useState, useEffect } from "react";
import { useCurrentUserProfile } from "../hooks/useUserProfile";
import { useAuthenticatedApi } from "../hooks/useAuthenticatedApi";
import { logger } from "../utils/logger";
import "./PrivacySettingsPage.css";

interface PrivacySettings {
  profile_visibility: string;
  list_visibility: string;
  activity_visibility: string;
  show_following: boolean;
  show_followers: boolean;
  show_statistics: boolean;
  allow_friend_requests: boolean;
  show_recently_watched: boolean;
}

const PrivacySettingsPage: React.FC = () => {
  const { profile, isLoading: profileLoading } = useCurrentUserProfile();
  const { makeAuthenticatedRequest } = useAuthenticatedApi();

  const [settings, setSettings] = useState<PrivacySettings>({
    profile_visibility: "public",
    list_visibility: "public",
    activity_visibility: "public",
    show_following: true,
    show_followers: true,
    show_statistics: true,
    allow_friend_requests: true,
    show_recently_watched: true,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!profileLoading && profile) {
      loadPrivacySettings();
    }
  }, [profileLoading, profile]);

  const loadPrivacySettings = async () => {
    try {
      const response = await makeAuthenticatedRequest("/api/auth/privacy-settings");
      const data = response.data || response;

      if (data && typeof data === "object") {
        setSettings({
          profile_visibility: data.profile_visibility || "public",
          list_visibility: data.list_visibility || "public",
          activity_visibility: data.activity_visibility || "public",
          show_following: data.show_following !== false,
          show_followers: data.show_followers !== false,
          show_statistics: data.show_statistics !== false,
          allow_friend_requests: data.allow_friend_requests !== false,
          show_recently_watched: data.show_recently_watched !== false,
        });
      }
    } catch (error: any) {
      logger.error("Failed to load privacy settings", {
        error: error instanceof Error ? error.message : "Unknown error",
        context: "PrivacySettingsPage",
        operation: "loadPrivacySettings",
        userId: profile?.id
      });
      setSaveMessage({
        type: "error",
        message: "Failed to load privacy settings. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      await makeAuthenticatedRequest("/api/auth/privacy-settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });

      setSaveMessage({
        type: "success",
        message: "Privacy settings saved successfully!",
      });
    } catch (error: any) {
      setSaveMessage({
        type: "error",
        message: error.message || "Failed to save privacy settings. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings({
      profile_visibility: "public",
      list_visibility: "public",
      activity_visibility: "public",
      show_following: true,
      show_followers: true,
      show_statistics: true,
      allow_friend_requests: true,
      show_recently_watched: true,
    });
    setSaveMessage(null);
  };

  if (profileLoading || isLoading) {
    return (
      <div className="privacy-settings-page">
        <div className="privacy-container">
          <div className="privacy-header">
            <h1 className="privacy-title">Privacy Settings</h1>
            <p className="privacy-subtitle">Loading your privacy preferences...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="privacy-settings-page">
        <div className="privacy-container">
          <div className="privacy-header">
            <h1 className="privacy-title">Privacy Settings</h1>
            <p className="privacy-subtitle">Please log in to access privacy settings.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="privacy-settings-page">
      <div className="privacy-container">
        <div className="privacy-header">
          <h1 className="privacy-title">Privacy Settings</h1>
          <p className="privacy-subtitle">Control who can see your information and activity</p>
        </div>

        {saveMessage && <div className={`save-message ${saveMessage.type}`}>{saveMessage.message}</div>}

        <form className="privacy-form" onSubmit={(e) => e.preventDefault()}>
          <div className="settings-card">
            {/* Profile Visibility */}
            <div className="settings-section">
              <div className="section-header">
                <h3 className="section-title">
                  <svg className="section-icon" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4Zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10Z" />
                  </svg>
                  Profile Visibility
                </h3>
                <p className="section-description">Choose who can view your profile information</p>
              </div>
              <div className="options-grid">
                {[
                  { value: "public", label: "Public", description: "Anyone can view your profile" },
                  {
                    value: "friends_only",
                    label: "Friends Only",
                    description: "Only your friends can see your profile",
                  },
                  { value: "private", label: "Private", description: "Only you can see your profile" },
                ].map((option) => (
                  <div
                    key={option.value}
                    className={`option-card ${
                      settings.profile_visibility === option.value ? "selected" : ""
                    }`}
                    onClick={() => setSettings({ ...settings, profile_visibility: option.value })}
                  >
                    <div className="option-content">
                      <div className="custom-radio">
                        <input
                          type="radio"
                          className="hidden-input"
                          name="profile_visibility"
                          value={option.value}
                          checked={settings.profile_visibility === option.value}
                          onChange={() => {}}
                        />
                      </div>
                      <div className="option-details">
                        <div className="option-label">{option.label}</div>
                        <div className="option-description">{option.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* List Visibility */}
            <div className="settings-section">
              <div className="section-header">
                <h3 className="section-title">
                  <svg className="section-icon" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z" />
                  </svg>
                  List Visibility
                </h3>
                <p className="section-description">Control who can see your anime and manga lists</p>
              </div>
              <div className="options-grid">
                {[
                  { value: "public", label: "Public", description: "Anyone can view your lists" },
                  {
                    value: "friends_only",
                    label: "Friends Only",
                    description: "Only friends can see your lists",
                  },
                  { value: "private", label: "Private", description: "Only you can see your lists" },
                ].map((option) => (
                  <div
                    key={option.value}
                    className={`option-card ${settings.list_visibility === option.value ? "selected" : ""}`}
                    onClick={() => setSettings({ ...settings, list_visibility: option.value })}
                  >
                    <div className="option-content">
                      <div className="custom-radio">
                        <input
                          type="radio"
                          className="hidden-input"
                          name="list_visibility"
                          value={option.value}
                          checked={settings.list_visibility === option.value}
                          onChange={() => {}}
                        />
                      </div>
                      <div className="option-details">
                        <div className="option-label">{option.label}</div>
                        <div className="option-description">{option.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Visibility */}
            <div className="settings-section">
              <div className="section-header">
                <h3 className="section-title">
                  <svg className="section-icon" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zM8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zM7.5 3a.5.5 0 0 1 1 0v5.21l3.248 1.856a.5.5 0 0 1-.496.868L7.5 9.5V3z" />
                  </svg>
                  Activity Visibility
                </h3>
                <p className="section-description">Choose who can see your recent activity</p>
              </div>
              <div className="options-grid">
                {[
                  { value: "public", label: "Public", description: "Activity visible to everyone" },
                  {
                    value: "friends_only",
                    label: "Friends Only",
                    description: "Activity visible to friends only",
                  },
                  { value: "private", label: "Private", description: "Activity hidden from others" },
                ].map((option) => (
                  <div
                    key={option.value}
                    className={`option-card ${
                      settings.activity_visibility === option.value ? "selected" : ""
                    }`}
                    onClick={() => setSettings({ ...settings, activity_visibility: option.value })}
                  >
                    <div className="option-content">
                      <div className="custom-radio">
                        <input
                          type="radio"
                          className="hidden-input"
                          name="activity_visibility"
                          value={option.value}
                          checked={settings.activity_visibility === option.value}
                          onChange={() => {}}
                        />
                      </div>
                      <div className="option-details">
                        <div className="option-label">{option.label}</div>
                        <div className="option-description">{option.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Privacy Settings */}
            <div className="settings-section">
              <div className="section-header">
                <h3 className="section-title">
                  <svg className="section-icon" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M6 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-5 6s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H1zM11 3.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5zm.5 2.5a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1h-4zm2 3a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1h-2zm0 3a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1h-2z" />
                  </svg>
                  Additional Privacy Settings
                </h3>
                <p className="section-description">Control what information is visible to other users</p>
              </div>
              <div className="options-grid">
                <div
                  className={`checkbox-card ${settings.show_following ? "checked" : ""}`}
                  onClick={() => setSettings({ ...settings, show_following: !settings.show_following })}
                >
                  <div className="checkbox-content">
                    <div className="custom-checkbox">
                      <input
                        type="checkbox"
                        className="hidden-input"
                        checked={settings.show_following}
                        onChange={() => {}}
                      />
                    </div>
                    <div className="option-details">
                      <div className="checkbox-label">Show Following List</div>
                      <div className="checkbox-description">Allow others to see who you're following</div>
                    </div>
                  </div>
                </div>
                <div
                  className={`checkbox-card ${settings.show_followers ? "checked" : ""}`}
                  onClick={() => setSettings({ ...settings, show_followers: !settings.show_followers })}
                >
                  <div className="checkbox-content">
                    <div className="custom-checkbox">
                      <input
                        type="checkbox"
                        className="hidden-input"
                        checked={settings.show_followers}
                        onChange={() => {}}
                      />
                    </div>
                    <div className="option-details">
                      <div className="checkbox-label">Show Followers List</div>
                      <div className="checkbox-description">Allow others to see your followers</div>
                    </div>
                  </div>
                </div>
                <div
                  className={`checkbox-card ${settings.show_statistics ? "checked" : ""}`}
                  onClick={() => setSettings({ ...settings, show_statistics: !settings.show_statistics })}
                >
                  <div className="checkbox-content">
                    <div className="custom-checkbox">
                      <input
                        type="checkbox"
                        className="hidden-input"
                        checked={settings.show_statistics}
                        onChange={() => {}}
                      />
                    </div>
                    <div className="option-details">
                      <div className="checkbox-label">Show Statistics</div>
                      <div className="checkbox-description">Display your viewing statistics to others</div>
                    </div>
                  </div>
                </div>
                <div
                  className={`checkbox-card ${settings.allow_friend_requests ? "checked" : ""}`}
                  onClick={() =>
                    setSettings({ ...settings, allow_friend_requests: !settings.allow_friend_requests })
                  }
                >
                  <div className="checkbox-content">
                    <div className="custom-checkbox">
                      <input
                        type="checkbox"
                        className="hidden-input"
                        checked={settings.allow_friend_requests}
                        onChange={() => {}}
                      />
                    </div>
                    <div className="option-details">
                      <div className="checkbox-label">Allow Friend Requests</div>
                      <div className="checkbox-description">Let others send you friend requests</div>
                    </div>
                  </div>
                </div>
                <div
                  className={`checkbox-card ${settings.show_recently_watched ? "checked" : ""}`}
                  onClick={() =>
                    setSettings({ ...settings, show_recently_watched: !settings.show_recently_watched })
                  }
                >
                  <div className="checkbox-content">
                    <div className="custom-checkbox">
                      <input
                        type="checkbox"
                        className="hidden-input"
                        checked={settings.show_recently_watched}
                        onChange={() => {}}
                      />
                    </div>
                    <div className="option-details">
                      <div className="checkbox-label">Show Recently Watched</div>
                      <div className="checkbox-description">Display your recently watched items</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="action-buttons">
            <button type="button" className="btn btn-secondary" onClick={handleReset} disabled={isSaving}>
              Reset to Defaults
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          </div>

          <div className="privacy-notice">
            <div className="notice-content">
              <svg className="notice-icon" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
              </svg>
              <div className="notice-text">
                <div className="notice-title">Privacy Information</div>
                Your privacy settings may take a few minutes to take effect across all features. These
                settings only apply to other users - site administrators can always access your data as needed
                for moderation purposes.
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PrivacySettingsPage;
