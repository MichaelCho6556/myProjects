// ABOUTME: Core TypeScript interfaces for social features including user profiles, lists, and activities
// ABOUTME: Provides centralized type definitions for all social functionality components

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  joinDate: string; // ISO 8601 string
  avatarUrl?: string;
  bio?: string;
  isPrivate: boolean;
  isCurrentUser?: boolean;
  isFollowing?: boolean;
  isFollowedBy?: boolean;
  followersCount: number;
  followingCount: number;
  isMutualFollow?: boolean;
}

export interface UserStats {
  totalAnime: number;
  completedAnime: number;
  totalManga: number;
  completedManga: number;
  totalHoursWatched: number;
  totalChaptersRead: number;
  favoriteGenres: string[];
  averageRating: number;
  completionRate: number;
  currentStreak: number;
  longestStreak: number;
  ratingDistribution?: { [rating: string]: number };
}

export interface PrivacySettings {
  profileVisibility: "Public" | "Private" | "Friends Only";
  listVisibility: "Public" | "Private" | "Friends Only";
  activityVisibility: "Public" | "Private" | "Friends Only";
  showCompletionStats: boolean;
}

export interface CustomList {
  id: string;
  title: string;
  description?: string;
  privacy: "public" | "private" | "friends_only";
  tags: string[];
  createdAt: string;
  updatedAt: string;
  userId: string;
  username: string;
  creatorUsername?: string;
  displayName?: string;
  itemCount: number;
  followersCount: number;
  isFollowing?: boolean;
  isCollaborative?: boolean;
  items?: ListItem[];
}

export interface PublicList {
  id: string;
  title: string;
  description?: string;
  itemCount: number;
  privacy: "public" | "private" | "friends_only";
  isCollaborative: boolean;
  createdAt: string;
  updatedAt: string;
  url: string;
  isViewerFriend?: boolean;
  isOwnProfile?: boolean;
}

export interface ListItem {
  id: string;
  itemUid: string;
  title: string;
  mediaType: string;
  imageUrl?: string;
  order: number;
  addedAt: string;
  notes?: string;
  // Enhanced editing fields
  personalRating?: number; // 1-10 with decimal precision
  watchStatus?: "plan_to_watch" | "watching" | "completed" | "on_hold" | "dropped";
  customTags?: string[]; // User-defined tags for this item
  dateStarted?: string; // ISO date when user started watching/reading
  dateCompleted?: string; // ISO date when user completed it
  rewatchCount?: number; // Number of times user has rewatched/reread
}

export interface ListComment {
  id: string;
  content: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarUrl?: string;
  listId: string;
  parentCommentId?: string;
  spoilerWarning: boolean;
  likesCount: number;
  isLiked?: boolean;
  createdAt: string;
  updatedAt: string;
  replies?: ListComment[];
}

export interface Activity {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  type: "list_created" | "list_updated" | "item_completed" | "item_rated" | "list_followed";
  itemId?: string;
  itemTitle?: string;
  listId?: string;
  listTitle?: string;
  rating?: number;
  createdAt: string;
  aggregateCount?: number; // For grouped activities
}

export interface PopularList {
  id: string;
  title: string;
  description?: string;
  username: string;
  displayName: string;
  itemCount: number;
  followersCount: number;
  viewsThisWeek: number;
  isFollowing?: boolean;
  tags: string[];
  previewItems: ListItem[];
  trendingScore: number;
}

export interface ListRecommendation {
  list: CustomList;
  reason: string;
  score: number;
  reasonType: "similar_users" | "shared_items" | "shared_genres" | "followed_by_followees";
}

export interface UserSearchResult {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  isFollowing?: boolean;
  isPrivate: boolean;
  followersCount: number;
  completedAnime: number;
  completedManga: number;
  joinDate: string;
}

export interface ListSearchResult {
  id: string;
  title: string;
  description?: string;
  username: string;
  displayName: string;
  itemCount: number;
  followersCount: number;
  tags: string[];
  isFollowing?: boolean;
  previewItems: ListItem[];
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  usage_count: number;
}

export interface FollowRelationship {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface ListFollow {
  id: string;
  userId: string;
  listId: string;
  createdAt: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Hook state types
export interface UserProfileState {
  profile: UserProfile | null;
  stats: UserStats | null;
  isLoading: boolean;
  error: Error | null;
}

export interface SocialFeaturesState {
  activityFeed: Activity[];
  popularLists: PopularList[];
  recommendedLists: ListRecommendation[];
  isLoading: boolean;
  error: Error | null;
}

export interface ListManagementState {
  customLists: CustomList[];
  followedLists: CustomList[];
  isLoading: boolean;
  error: Error | null;
}
