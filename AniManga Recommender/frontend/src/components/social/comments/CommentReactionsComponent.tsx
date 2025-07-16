// ABOUTME: React component for comment reactions including likes, dislikes, and emoji reactions
// ABOUTME: Handles reaction toggling, counts display, and user interaction feedback

import React, { useState } from 'react';
import { CommentReactionsProps, ReactionType } from '../../../types/comments';
import { logger } from '../../../utils/logger';
import './CommentReactionsComponent.css';

interface ReactionConfig {
  type: ReactionType;
  emoji: string;
  label: string;
  isPrimary?: boolean;
}

const REACTION_CONFIG: ReactionConfig[] = [
  { type: 'like', emoji: '👍', label: 'Like', isPrimary: true },
  { type: 'dislike', emoji: '👎', label: 'Dislike', isPrimary: true },
  { type: 'laugh', emoji: '😂', label: 'Funny' },
  { type: 'heart', emoji: '❤️', label: 'Love' },
  { type: 'surprise', emoji: '😮', label: 'Surprising' },
  { type: 'thinking', emoji: '🤔', label: 'Thoughtful' },
  { type: 'sad', emoji: '😢', label: 'Sad' },
  { type: 'angry', emoji: '😡', label: 'Angry' }
];

export const CommentReactionsComponent: React.FC<CommentReactionsProps> = ({
  comment,
  onReact,
  currentUserId
}) => {
  const [showAllReactions, setShowAllReactions] = useState(false);
  const [isReacting, setIsReacting] = useState(false);

  const handleReaction = async (reactionType: ReactionType) => {
    if (isReacting || !currentUserId || comment.user_id === currentUserId) return;

    setIsReacting(true);
    try {
      await onReact(reactionType);
    } catch (error: any) {
      logger.error("Error reacting to comment", {
        error: error?.message || "Unknown error",
        context: "CommentReactionsComponent",
        operation: "handleReaction",
        reactionType: reactionType
      });
    } finally {
      setIsReacting(false);
    }
  };

  const primaryReactions = REACTION_CONFIG.filter(r => r.isPrimary);
  const secondaryReactions = REACTION_CONFIG.filter(r => !r.isPrimary);

  const canReact = currentUserId && comment.user_id !== currentUserId && !comment.deleted;

  return (
    <div className="comment-reactions">
      {/* Primary reactions (always visible) */}
      <div className="primary-reactions">
        {primaryReactions.map((reaction) => {
          const count = reaction.type === 'like' ? comment.like_count : 
                      reaction.type === 'dislike' ? comment.dislike_count : 0;
          
          return (
            <button
              key={reaction.type}
              className={`reaction-button primary ${isReacting ? 'disabled' : ''}`}
              onClick={() => handleReaction(reaction.type)}
              disabled={!canReact || isReacting}
              title={reaction.label}
            >
              <span className="reaction-emoji">{reaction.emoji}</span>
              {count > 0 && <span className="reaction-count">{count}</span>}
            </button>
          );
        })}

        {/* Show more reactions button */}
        {canReact && (
          <button
            className="more-reactions-button"
            onClick={() => setShowAllReactions(!showAllReactions)}
            title="More reactions"
          >
            <span className="more-reactions-icon">
              {showAllReactions ? '−' : '+'}
            </span>
          </button>
        )}
      </div>

      {/* Secondary reactions (shown when expanded) */}
      {showAllReactions && canReact && (
        <div className="secondary-reactions">
          {secondaryReactions.map((reaction) => (
            <button
              key={reaction.type}
              className={`reaction-button secondary ${isReacting ? 'disabled' : ''}`}
              onClick={() => handleReaction(reaction.type)}
              disabled={isReacting}
              title={reaction.label}
            >
              <span className="reaction-emoji">{reaction.emoji}</span>
            </button>
          ))}
        </div>
      )}

      {/* Total reactions count (if there are other reactions) */}
      {comment.total_reactions > (comment.like_count + comment.dislike_count) && (
        <div className="total-reactions">
          <span className="total-reactions-count">
            +{comment.total_reactions - (comment.like_count + comment.dislike_count)} more
          </span>
        </div>
      )}

      {/* Reaction summary for accessibility */}
      <div className="reaction-summary sr-only">
        {comment.like_count > 0 && `${comment.like_count} likes`}
        {comment.dislike_count > 0 && `${comment.dislike_count} dislikes`}
        {comment.total_reactions > 0 && `${comment.total_reactions} total reactions`}
      </div>
    </div>
  );
};