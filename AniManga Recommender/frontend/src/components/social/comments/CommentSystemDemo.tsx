// ABOUTME: Demo component showing how to integrate the comment system into item detail pages
// ABOUTME: Provides a complete example of comment thread integration for anime/manga items

import React from 'react';
import { CommentThreadComponent } from './CommentThreadComponent';

interface CommentSystemDemoProps {
  itemUid?: string;
  listId?: string;
  reviewId?: string;
  title?: string;
}

export const CommentSystemDemo: React.FC<CommentSystemDemoProps> = ({
  itemUid,
  listId,
  reviewId,
  title = "Comments"
}) => {
  // Determine parent type and ID based on props
  const getParentInfo = () => {
    if (itemUid) return { parentType: 'item' as const, parentId: itemUid };
    if (listId) return { parentType: 'list' as const, parentId: listId };
    if (reviewId) return { parentType: 'review' as const, parentId: reviewId };
    return null;
  };

  const parentInfo = getParentInfo();

  if (!parentInfo) {
    return (
      <div className="comment-system-demo">
        <p>No valid parent provided for comments</p>
      </div>
    );
  }

  return (
    <div className="comment-system-demo">
      <div className="comment-section-header">
        <h2>{title}</h2>
        <p className="comment-section-description">
          Join the discussion about this {parentInfo.parentType}. 
          Share your thoughts, ask questions, and connect with other fans!
        </p>
      </div>

      <CommentThreadComponent
        parentType={parentInfo.parentType}
        parentId={parentInfo.parentId}
        initialSort="newest"
      />
    </div>
  );
};

// Example usage components for different contexts

export const ItemCommentsSection: React.FC<{ itemUid: string }> = ({ itemUid }) => (
  <CommentSystemDemo
    itemUid={itemUid}
    title="Discussion"
  />
);

export const ListCommentsSection: React.FC<{ listId: string }> = ({ listId }) => (
  <CommentSystemDemo
    listId={listId}
    title="List Comments"
  />
);

export const ReviewCommentsSection: React.FC<{ reviewId: string }> = ({ reviewId }) => (
  <CommentSystemDemo
    reviewId={reviewId}
    title="Review Discussion"
  />
);