// ABOUTME: Barrel export file for comment system components
// ABOUTME: Provides centralized exports for all comment-related components and utilities

export { CommentThreadComponent } from './CommentThreadComponent';
export { CommentForm } from './CommentForm';
export { Comment } from './Comment';
export { CommentReactionsComponent } from './CommentReactionsComponent';
export { CommentModerationTools } from './CommentModerationTools';

// Re-export types for convenience
export type {
  Comment as CommentType,
  CommentAuthor,
  CreateCommentRequest,
  UpdateCommentRequest,
  CommentReaction,
  ReactionType,
  CommentReport,
  CommentReportReason,
  ReportCommentRequest,
  CommentsPaginationInfo,
  CommentsResponse,
  CommentRepliesResponse,
  CreateCommentResponse,
  UpdateCommentResponse,
  DeleteCommentResponse,
  ReactToCommentResponse,
  ReportCommentResponse,
  CommentSortOption,
  CommentFilters,
  MentionUser,
  CommentFormData,
  CommentThreadProps,
  CommentFormProps,
  CommentItemProps,
  CommentReactionsProps,
  CommentModerationProps
} from '../../../types/comments';

// Re-export hooks for convenience
export { useComments, useMentions } from '../../../hooks/useComments';
export type { UseCommentsResult, UseMentionsResult } from '../../../hooks/useComments';