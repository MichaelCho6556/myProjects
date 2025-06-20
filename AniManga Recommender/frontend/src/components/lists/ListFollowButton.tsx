// ABOUTME: Follow button component specifically for user-created lists with optimistic updates
// ABOUTME: Handles list following functionality separate from user following with proper state management

import React, { useState } from "react";

interface ListFollowButtonProps {
  isFollowing: boolean;
  onToggleFollow: () => Promise<void>;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

export const ListFollowButton: React.FC<ListFollowButtonProps> = ({
  isFollowing,
  onToggleFollow,
  disabled = false,
  size = "sm",
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    try {
      await onToggleFollow();
    } catch (error) {
      console.error("Failed to toggle list follow:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const baseClasses = `
    font-medium rounded-lg transition-colors duration-200 
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    ${sizeClasses[size]}
  `;

  if (isFollowing) {
    return (
      <button
        onClick={handleClick}
        disabled={disabled || isLoading}
        className={`
          ${baseClasses}
          bg-gray-200 text-gray-800 hover:bg-gray-300
          dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500
          focus:ring-gray-500
        `}
      >
        {isLoading ? "Unfollowing..." : "Following"}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={`
        ${baseClasses}
        bg-blue-600 text-white hover:bg-blue-700
        dark:bg-blue-500 dark:hover:bg-blue-600
        focus:ring-blue-500
      `}
    >
      {isLoading ? "Following..." : "Follow"}
    </button>
  );
};
