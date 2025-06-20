// ABOUTME: TypeScript interfaces and types for the comment system
// ABOUTME: Defines comment data structures, reactions, and API response types

export interface CommentAuthor {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface Comment {
  id: number;
  parent_type: "item" | "list" | "review";
  parent_id: string;
  parent_comment_id: number | null;
  user_id: string;
  content: string;
  contains_spoilers: boolean;
  mentions: string[];
  created_at: string;
  updated_at: string;
  edited: boolean;
  deleted: boolean;
  thread_depth: number;
  like_count: number;
  dislike_count: number;
  total_reactions: number;
  author?: CommentAuthor;
  replies?: Comment[];
  reply_count?: number;
  has_more_replies?: boolean;
}

export interface CreateCommentRequest {
  parent_type: "item" | "list" | "review";
  parent_id: string;
  content: string;
  parent_comment_id?: number | undefined;
  contains_spoilers?: boolean | undefined;
  mentions?: string[] | undefined;
}

export interface UpdateCommentRequest {
  content: string;
}

export interface CommentReaction {
  id: number;
  comment_id: number;
  user_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

export type ReactionType =
  | "like"
  | "dislike"
  | "thumbs_up"
  | "thumbs_down"
  | "laugh"
  | "surprise"
  | "sad"
  | "angry"
  | "heart"
  | "thinking";

export interface ReactToCommentRequest {
  reaction_type: ReactionType;
}

export interface ReactToCommentResponse {
  message: string;
  reaction_type: ReactionType;
  action: "added" | "removed";
  like_count: number;
  dislike_count: number;
  total_reactions: number;
}

export interface CommentReport {
  id: number;
  comment_id: number;
  reporter_id: string | null;
  report_reason: CommentReportReason;
  additional_context: string;
  anonymous: boolean;
  status: "pending" | "reviewed" | "resolved" | "dismissed";
  created_at: string;
  resolved_at: string | null;
  resolution_action: string | null;
  moderator_id: string | null;
}

export type CommentReportReason = "spam" | "harassment" | "inappropriate" | "offensive" | "other";

export interface ReportCommentRequest {
  report_reason: CommentReportReason;
  additional_context?: string;
  anonymous?: boolean;
}

export interface CommentsPaginationInfo {
  current_page: number;
  per_page: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface CommentsResponse {
  comments: Comment[];
  pagination: CommentsPaginationInfo;
}

export interface CommentRepliesResponse {
  replies: Comment[];
  pagination: CommentsPaginationInfo;
}

export interface CreateCommentResponse {
  message: string;
  comment: Comment;
}

export interface UpdateCommentResponse {
  message: string;
  comment: Comment;
}

export interface DeleteCommentResponse {
  message: string;
}

export interface ReportCommentResponse {
  message: string;
  report_id: number;
}

export type CommentSortOption = "newest" | "oldest" | "most_liked";

export interface CommentFilters {
  sort: CommentSortOption;
  page: number;
  limit: number;
}

export interface MentionUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface CommentFormData {
  content: string;
  contains_spoilers: boolean;
  mentions: string[];
}

export interface CommentThreadProps {
  parentType: "item" | "list" | "review";
  parentId: string;
  initialSort?: CommentSortOption;
}

export interface CommentFormProps {
  parentType: "item" | "list" | "review";
  parentId: string;
  parentCommentId?: number;
  onCommentCreated?: (commentData: CreateCommentRequest) => void;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export interface CommentItemProps {
  comment: Comment;
  onReply: (commentId: number) => void;
  onEdit: (commentId: number) => void;
  onDelete: (commentId: number) => void;
  onReport: (commentId: number) => void;
  onReact: (commentId: number, reactionType: ReactionType) => void;
  canModerate?: boolean;
  currentUserId: string;
}

export interface CommentReactionsProps {
  comment: Comment;
  onReact: (reactionType: ReactionType) => void;
  currentUserId: string;
}

export interface CommentModerationProps {
  comment: Comment;
  onReport: () => void;
  onModerate?: (action: "hide" | "delete" | "warn") => void;
  canModerate?: boolean;
}
