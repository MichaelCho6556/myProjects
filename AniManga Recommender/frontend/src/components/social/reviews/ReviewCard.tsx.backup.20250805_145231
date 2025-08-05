// ABOUTME: Individual review display component with voting and reporting functionality
// ABOUTME: Handles spoiler content, user interactions, and review management

import React, { useState } from "react";
import { Review } from "../../../types/reviews";
import { ReviewVotingComponent } from "./ReviewVotingComponent";
import { ReviewModerationComponent } from "./ReviewModerationComponent";

interface ReviewCardProps {
  review: Review;
  currentUserId?: string;
  className?: string;
}

const StarDisplay: React.FC<{ rating: number; label?: string; compact?: boolean }> = ({
  rating,
  label,
  compact = false,
}) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  return (
    <div className={`flex items-center ${compact ? "space-x-1" : "space-x-2"}`}>
      {label && !compact && (
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}:</span>
      )}
      <div className="flex items-center space-x-0.5">
        {[...Array(10)].map((_, i) => (
          <svg
            key={i}
            className={`${compact ? "w-3 h-3" : "w-4 h-4"} ${
              i < fullStars
                ? "text-yellow-400"
                : i === fullStars && hasHalfStar
                ? "text-yellow-400"
                : "text-gray-300 dark:text-gray-600"
            }`}
            fill={i < fullStars || (i === fullStars && hasHalfStar) ? "currentColor" : "none"}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        ))}
      </div>
      <span className={`${compact ? "text-xs" : "text-sm"} font-medium text-gray-700 dark:text-gray-300`}>
        {rating.toFixed(1)}/10
      </span>
    </div>
  );
};

const SpoilerContent: React.FC<{ content: string; spoilerLevel?: string | undefined }> = ({
  content,
  spoilerLevel,
}) => {
  const [revealedSpoilers, setRevealedSpoilers] = useState<Set<number>>(new Set());

  const renderContentWithSpoilers = (text: string, level: string) => {
    // Simple spoiler detection and handling
    const spoilerRegex = /\[spoiler\](.*?)\[\/spoiler\]/gi;
    const parts: { type: "text" | "spoiler"; content: string; level?: string }[] = [];
    let lastIndex = 0;
    let match;

    while ((match = spoilerRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
      }
      parts.push({ type: "spoiler", content: match[1], level });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push({ type: "text", content: text.slice(lastIndex) });
    }

    return parts.map((part, i) => {
      if (part.type === "text") {
        return <span key={i}>{part.content}</span>;
      } else {
        const isRevealed = revealedSpoilers.has(i);
        return (
          <span
            key={i}
            className={`spoiler ${isRevealed ? "revealed" : ""} ${part.level || ""}`}
            onClick={() => {
              const newRevealed = new Set(revealedSpoilers);
              if (isRevealed) {
                newRevealed.delete(i);
              } else {
                newRevealed.add(i);
              }
              setRevealedSpoilers(newRevealed);
            }}
          >
            {isRevealed ? part.content : "[SPOILER]"}
          </span>
        );
      }
    });
  };

  return <div className="spoiler-content">{renderContentWithSpoilers(content, spoilerLevel || "")}</div>;
};

export const ReviewCard: React.FC<ReviewCardProps> = ({ review, currentUserId, className = "" }) => {
  const [showModerationModal, setShowModerationModal] = useState(false);
  const isOwnReview = currentUserId === review.user_id;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 168) {
      // 7 days
      const days = Math.floor(diffInHours / 24);
      return `${days}d ago`;
    } else {
      return formatDate(dateString);
    }
  };

  const getHelpfulnessColor = (score: number) => {
    if (score >= 10) return "text-green-600 dark:text-green-400";
    if (score >= 0) return "text-gray-600 dark:text-gray-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 ${className}`}
    >
      {/* Spoiler Warning */}
      {review.contains_spoilers && (
        <div
          className={`mb-4 p-3 rounded-lg border-l-4 ${
            review.spoiler_level === "major"
              ? "bg-red-50 dark:bg-red-900/30 border-red-400 dark:border-red-600"
              : "bg-yellow-50 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-600"
          }`}
        >
          <div className="flex items-center">
            <svg
              className={`w-5 h-5 mr-2 ${
                review.spoiler_level === "major"
                  ? "text-red-500 dark:text-red-400"
                  : "text-yellow-500 dark:text-yellow-400"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 19c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <span
              className={`text-sm font-medium ${
                review.spoiler_level === "major"
                  ? "text-red-700 dark:text-red-300"
                  : "text-yellow-700 dark:text-yellow-300"
              }`}
            >
              ⚠️ {review.spoiler_level === "major" ? "Major" : "Minor"} Spoilers Warning
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3">
          {/* User Avatar */}
          <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
            {review.user_profiles.avatar_url ? (
              <img
                src={review.user_profiles.avatar_url}
                alt={`${review.user_profiles.display_name}'s avatar`}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <span className="text-lg font-semibold text-gray-600 dark:text-gray-300">
                {review.user_profiles.display_name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* User Info and Rating */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {review.user_profiles.display_name}
              </h4>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                @{review.user_profiles.username}
              </span>
              {isOwnReview && (
                <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                  Your Review
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3 mb-2">
              <StarDisplay rating={review.overall_rating} compact />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {formatRelativeTime(review.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions Menu */}
        <div className="flex items-center space-x-2">
          {!isOwnReview && currentUserId && (
            <button
              onClick={() => setShowModerationModal(true)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Report review"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Review Title */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{review.title}</h3>

      {/* Aspect Ratings */}
      {(review.story_rating || review.characters_rating || review.art_rating || review.sound_rating) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          {review.story_rating && (
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Story</div>
              <StarDisplay rating={review.story_rating} compact />
            </div>
          )}
          {review.characters_rating && (
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Characters</div>
              <StarDisplay rating={review.characters_rating} compact />
            </div>
          )}
          {review.art_rating && (
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Art</div>
              <StarDisplay rating={review.art_rating} compact />
            </div>
          )}
          {review.sound_rating && (
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sound</div>
              <StarDisplay rating={review.sound_rating} compact />
            </div>
          )}
        </div>
      )}

      {/* Review Content */}
      <div className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
        <SpoilerContent content={review.content} spoilerLevel={review.spoiler_level || undefined} />
      </div>

      {/* Recommended For Tags */}
      {review.recommended_for && review.recommended_for.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Recommended for:</div>
          <div className="flex flex-wrap gap-2">
            {review.recommended_for.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full"
              >
                {tag.replace("_", " ")}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        {/* Voting Component */}
        <ReviewVotingComponent
          reviewId={review.id}
          initialStats={{
            total_votes: review.total_votes,
            helpful_votes: review.helpful_votes,
            helpfulness_percentage:
              review.total_votes > 0 ? (review.helpful_votes / review.total_votes) * 100 : 0,
            user_vote: null, // This will be fetched by the component
          }}
          disabled={isOwnReview || !currentUserId}
        />

        {/* Helpfulness Score */}
        <div className="text-sm">
          <span className="text-gray-500 dark:text-gray-400">Helpfulness: </span>
          <span className={`font-medium ${getHelpfulnessColor(review.helpfulness_score)}`}>
            {review.helpfulness_score > 0 ? "+" : ""}
            {review.helpfulness_score}
          </span>
        </div>
      </div>

      {/* Moderation Modal */}
      {showModerationModal && (
        <ReviewModerationComponent
          reviewId={review.id}
          onClose={() => setShowModerationModal(false)}
          onReportSubmitted={() => {
            setShowModerationModal(false);
            // Could show a success toast here
          }}
        />
      )}
    </div>
  );
};
