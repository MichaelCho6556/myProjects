// ABOUTME: TypeScript type definitions for the review system
// ABOUTME: Defines interfaces for reviews, votes, reports, and API responses

export interface Review {
  id: number;
  user_id: string;
  item_uid: string;
  title: string;
  content: string;
  overall_rating: number;
  story_rating?: number;
  characters_rating?: number;
  art_rating?: number;
  sound_rating?: number;
  contains_spoilers: boolean;
  spoiler_level?: 'minor' | 'major';
  recommended_for: string[];
  helpfulness_score: number;
  total_votes: number;
  helpful_votes: number;
  created_at: string;
  updated_at: string;
  status: 'draft' | 'published' | 'moderated' | 'deleted';
  moderation_reason?: string;
  user_profiles: {
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

export interface ReviewVoteStats {
  total_votes: number;
  helpful_votes: number;
  helpfulness_percentage: number;
  user_vote?: 'helpful' | 'not_helpful' | null;
}

export interface ReviewFormData {
  item_uid: string;
  title: string;
  content: string;
  overall_rating: number;
  story_rating?: number;
  characters_rating?: number;
  art_rating?: number;
  sound_rating?: number;
  contains_spoilers: boolean;
  spoiler_level?: 'minor' | 'major';
  recommended_for: string[];
}

export interface ReviewReport {
  review_id: number;
  report_reason: 'spam' | 'inappropriate' | 'spoilers' | 'harassment' | 'fake' | 'other';
  additional_context?: string;
  anonymous: boolean;
}

export interface ReviewsResponse {
  reviews: Review[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface ReviewVoteRequest {
  vote_type: 'helpful' | 'not_helpful';
  reason?: string;
}

export interface AspectRatings {
  story_rating?: number;
  characters_rating?: number;
  art_rating?: number;
  sound_rating?: number;
}

export type ReviewSortBy = 'helpfulness' | 'newest' | 'oldest' | 'rating';

export interface ReviewFilters {
  sort_by: ReviewSortBy;
  show_spoilers: boolean;
  min_rating?: number;
  max_rating?: number;
  contains_spoilers?: boolean;
}

export interface SpoilerContent {
  isVisible: boolean;
  content: string;
}

export interface RecommendedAudienceTag {
  id: string;
  label: string;
  description: string;
}