/**
 * Core Application Types
 * Comprehensive type definitions for the AniManga Recommender application
 */

// ================================
// Core Data Types
// ================================

/**
 * Base anime/manga item structure
 */
export interface AnimeItem {
  uid: string;
  title: string;
  media_type: "anime" | "manga";
  genres: string[];
  themes: string[];
  demographics: string[];
  score: number;
  scored_by: number;
  status:
    | "Finished Airing"
    | "Currently Airing"
    | "Not yet aired"
    | "Publishing"
    | "Finished"
    | "On Hiatus"
    | "Discontinued";
  episodes?: number;
  chapters?: number;
  volumes?: number;
  start_date: string;
  end_date?: string;
  rating?: string;
  popularity: number;
  members: number;
  favorites: number;
  synopsis: string;
  background?: string;
  season?: string;
  year?: number;
  broadcast?: string;
  producers: string[];
  licensors: string[];
  studios: string[];
  source?: string;
  duration?: string;
  authors: string[];
  serializations: string[];
  image_url?: string;
  trailer_url?: string;
  title_english?: string;
  title_japanese?: string;
  title_synonyms: string[];
  type?: string;
  aired?: string;
  published?: string;
  url?: string;
  related?: Record<string, string[]>;
  external_links?: Array<{ name: string; url: string }>;
}

export interface UserActivity {
  id: number;
  user_id: string;
  activity_type: string;
  item_uid: string;
  activity_data: Record<string, any>;
  created_at: string;
  item?: AnimeItem;
}

export interface UserStatistics {
  user_id: string;
  total_anime_watched: number;
  total_manga_read: number;
  total_hours_watched: number;
  total_chapters_read: number;
  average_score: number;
  favorite_genres: string[];
  current_streak_days: number;
  longest_streak_days: number;
  completion_rate: number;
  updated_at: string;
}

export interface UserItem {
  id: number;
  user_id: string;
  item_uid: string;
  status: "plan_to_watch" | "watching" | "completed" | "on_hold" | "dropped";
  progress: number;
  rating?: number;
  start_date?: string;
  completion_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  item?: AnimeItem;
}

export interface QuickStats {
  total_items: number;
  watching: number;
  completed: number;
  plan_to_watch: number;
  on_hold: number;
  dropped: number;
}

export interface DashboardData {
  user_stats: UserStatistics;
  recent_activity: UserActivity[];
  in_progress: UserItem[];
  completed_recently: UserItem[];
  plan_to_watch: UserItem[];
  on_hold: UserItem[];
  quick_stats: QuickStats;
}

/**
 * API response structure for paginated items
 */
export interface ItemsApiResponse {
  items: AnimeItem[];
  total_items: number;
  total_pages: number;
  current_page: number;
  items_per_page: number;
}

/**
 * API response structure for distinct filter values
 */
export interface DistinctValuesApiResponse {
  media_types: string[];
  genres: string[];
  themes: string[];
  demographics: string[];
  statuses: string[];
  studios: string[];
  authors: string[];
  sources: string[];
  ratings: string[];
}

// ================================
// Component Props Types
// ================================

/**
 * React-Select option type
 */
export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Filter state structure
 */
export interface FilterState {
  selectedMediaType: string;
  selectedGenre: SelectOption[];
  selectedTheme: SelectOption[];
  selectedDemographic: SelectOption[];
  selectedStudio: SelectOption[];
  selectedAuthor: SelectOption[];
  selectedStatus: string;
  minScore: string;
  selectedYear: string;
  sortBy: string;
}

/**
 * Filter options structure
 */
export interface FilterOptions {
  mediaTypeOptions: SelectOption[];
  genreOptions: SelectOption[];
  themeOptions: SelectOption[];
  demographicOptions: SelectOption[];
  studioOptions: SelectOption[];
  authorOptions: SelectOption[];
  statusOptions: SelectOption[];
}

/**
 * Filter change handlers
 */
export interface FilterHandlers {
  handleSortChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  handleMediaTypeChange: (selectedOption: SelectOption | null) => void;
  handleStatusChange: (selectedOption: SelectOption | null) => void;
  handleGenreChange: (selectedOptions: readonly SelectOption[] | null) => void;
  handleThemeChange: (selectedOptions: readonly SelectOption[] | null) => void;
  handleDemographicChange: (selectedOptions: readonly SelectOption[] | null) => void;
  handleStudioChange: (selectedOptions: readonly SelectOption[] | null) => void;
  handleAuthorChange: (selectedOptions: readonly SelectOption[] | null) => void;
  handleMinScoreChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleYearChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleResetFilters: () => void;
}

/**
 * FilterBar component props
 */
export interface FilterBarProps {
  filters: FilterState;
  filterOptions: FilterOptions;
  handlers: FilterHandlers;
  loading: boolean;
  filtersLoading: boolean;
}

/**
 * PaginationControls component props
 */
export interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  items?: AnimeItem[];
  loading?: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
  className?: string;
}

/**
 * ItemCard component props
 */
export interface ItemCardProps {
  item: AnimeItem;
  className?: string;
}

/**
 * SkeletonCard component props
 */
export interface SkeletonCardProps {
  className?: string;
}

/**
 * Spinner component props
 */
export interface SpinnerProps {
  size?: string | number;
  color?: string;
  className?: string;
}

// ================================
// Error Handling Types
// ================================

/**
 * Parsed error structure
 */
export interface ParsedError {
  userMessage: string;
  technicalDetails: string;
  statusCode: number | null;
  originalError: Error;
}

/**
 * Error handler function type
 */
export type ErrorHandler = (error: Error, context?: string) => ParsedError;

/**
 * Response validation structure
 */
export interface ValidationStructure {
  [key: string]: "string" | "number" | "boolean" | "array" | "object" | "required" | "any";
}

// ================================
// Utility Types
// ================================

/**
 * Sort options for items
 */
export type SortOption =
  | "score_desc"
  | "score_asc"
  | "popularity_desc"
  | "title_asc"
  | "title_desc"
  | "start_date_desc"
  | "start_date_asc";

/**
 * Media type options
 */
export type MediaType = "All" | "anime" | "manga";

/**
 * Status options
 */
export type StatusType =
  | "All"
  | "Finished Airing"
  | "Currently Airing"
  | "Not yet aired"
  | "Publishing"
  | "Finished"
  | "On Hiatus"
  | "Discontinued";

/**
 * API endpoints
 */
export type ApiEndpoint = "/items" | "/distinct-values" | "/item";

/**
 * URL search parameters type
 */
export interface SearchParams {
  page?: string;
  per_page?: string;
  q?: string;
  media_type?: string;
  genre?: string;
  theme?: string;
  demographic?: string;
  studio?: string;
  author?: string;
  status?: string;
  min_score?: string;
  year?: string;
  sort_by?: string;
}

// ================================
// Hook Types
// ================================

/**
 * useDocumentTitle hook type
 */
export type UseDocumentTitle = (title: string) => void;

/**
 * API operation type for retry functionality
 */
export type ApiOperation<T = any> = () => Promise<{ data: T }>;

// ================================
// React-Select Custom Types
// ================================

/**
 * Custom styles for react-select
 */
export interface CustomSelectStyles {
  control: (provided: any, state: any) => any;
  valueContainer: (provided: any) => any;
  input: (provided: any) => any;
  placeholder: (provided: any) => any;
  singleValue: (provided: any) => any;
  multiValue: (provided: any) => any;
  multiValueLabel: (provided: any) => any;
  multiValueRemove: (provided: any) => any;
  menu: (provided: any) => any;
  option: (provided: any, state: any) => any;
  indicatorSeparator: () => any;
  dropdownIndicator: (provided: any) => any;
}

// ================================
// Event Handler Types
// ================================

/**
 * Generic event handler types
 */
export type InputChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => void;
export type SelectChangeHandler = (event: React.ChangeEvent<HTMLSelectElement>) => void;
export type FormSubmitHandler = (event: React.FormEvent<HTMLFormElement>) => void;
export type ButtonClickHandler = (event: React.MouseEvent<HTMLButtonElement>) => void;

/**
 * React-Select specific handlers
 */
export type ReactSelectChangeHandler = (selectedOption: SelectOption | null) => void;
export type ReactSelectMultiChangeHandler = (selectedOptions: SelectOption[] | null) => void;

// ================================
// Axios Types
// ================================

/**
 * Axios response type for our API
 */
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: any;
  config: any;
}

/**
 * Axios error type
 */
export interface ApiError extends Error {
  response?: {
    data: any;
    status: number;
    statusText: string;
  };
  request?: any;
  code?: string;
}

// ================================
// Environment & Configuration
// ================================

/**
 * Environment configuration
 */
export interface AppConfig {
  API_BASE_URL: string;
  DEBOUNCE_DELAY: number;
  DEFAULT_ITEMS_PER_PAGE: number;
  ITEMS_PER_PAGE_OPTIONS: number[];
}

/**
 * Local storage keys
 */
export enum LocalStorageKeys {
  ITEMS_PER_PAGE = "aniMangaItemsPerPage",
  USER_PREFERENCES = "aniMangaUserPreferences",
  THEME = "aniMangaTheme",
}
