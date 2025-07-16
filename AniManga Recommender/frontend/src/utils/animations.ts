// ABOUTME: Animation utilities and constants for consistent micro-interactions
// ABOUTME: Provides reusable animation classes and timing functions for enhanced UX

// Animation timing constants
export const ANIMATION_DURATIONS = {
  fast: 150,
  normal: 200,
  slow: 300,
  extra_slow: 500
} as const;

// Easing functions
export const EASING = {
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
} as const;

// Common animation classes for Tailwind
export const ANIMATIONS = {
  // Hover effects
  hoverLift: 'transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-lg',
  hoverScale: 'transition-transform duration-200 ease-out hover:scale-105',
  hoverGlow: 'transition-all duration-200 ease-out hover:shadow-md hover:shadow-blue-500/25',
  
  // Button interactions
  buttonPress: 'transition-all duration-150 ease-out active:scale-95',
  buttonHover: 'transition-all duration-200 ease-out hover:shadow-md',
  
  // Card interactions
  cardHover: 'transition-all duration-300 ease-out hover:shadow-xl hover:-translate-y-2',
  cardPress: 'transition-all duration-150 ease-out active:scale-98',
  
  // Loading states
  pulse: 'animate-pulse',
  spin: 'animate-spin',
  bounce: 'animate-bounce',
  
  // Fade effects
  fadeIn: 'transition-opacity duration-300 ease-out',
  fadeOut: 'transition-opacity duration-200 ease-in',
  
  // Slide effects
  slideUp: 'transition-transform duration-300 ease-out translate-y-0',
  slideDown: 'transition-transform duration-300 ease-out',
  slideLeft: 'transition-transform duration-300 ease-out translate-x-0',
  slideRight: 'transition-transform duration-300 ease-out',
  
  // Focus states
  focusRing: 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
  focusVisible: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
  
  // Color transitions
  colorTransition: 'transition-colors duration-200 ease-out',
  backgroundTransition: 'transition-all duration-200 ease-out',
  
  // Border effects
  borderGlow: 'transition-all duration-200 ease-out hover:border-blue-400 hover:shadow-sm',
  
  // Text effects
  textShimmer: 'bg-gradient-to-r from-gray-900 via-blue-600 to-gray-900 bg-size-200 bg-pos-0 hover:bg-pos-100 transition-all duration-500 ease-out bg-clip-text',
  
  // Container effects
  containerExpand: 'transition-all duration-300 ease-out',
  containerCollapse: 'transition-all duration-250 ease-in',
  
  // Icon animations
  iconRotate: 'transition-transform duration-200 ease-out',
  iconBounce: 'transition-transform duration-200 ease-out hover:scale-110',
  iconSpin: 'transition-transform duration-300 ease-out hover:rotate-12',
  
  // Modal animations
  modalBackdrop: 'transition-opacity duration-300 ease-out',
  modalContent: 'transition-all duration-300 ease-out transform',
  modalSlideUp: 'translate-y-0 opacity-100',
  modalSlideDown: 'translate-y-full opacity-0',
  
  // Filter and search animations
  filterReveal: 'transition-all duration-300 ease-out',
  searchExpand: 'transition-all duration-400 ease-out',
  
  // Loading skeleton effects
  skeletonShimmer: 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700'
} as const;

// Animation state classes
export const ANIMATION_STATES = {
  // Entry animations
  entering: {
    opacity: 'opacity-0',
    scale: 'scale-95',
    translateY: 'translate-y-4'
  },
  entered: {
    opacity: 'opacity-100',
    scale: 'scale-100',
    translateY: 'translate-y-0'
  },
  
  // Exit animations
  exiting: {
    opacity: 'opacity-0',
    scale: 'scale-95',
    translateY: 'translate-y-4'
  },
  exited: {
    opacity: 'opacity-0',
    scale: 'scale-95',
    translateY: 'translate-y-4'
  }
} as const;

// Helper function to combine animation classes
export const combineAnimations = (...animations: string[]): string => {
  return animations.filter(Boolean).join(' ');
};

// Helper function for staggered animations
export const getStaggerDelay = (index: number, baseDelay: number = 50): number => {
  return index * baseDelay;
};

// Helper function for creating dynamic animation styles
export const createAnimationStyle = (
  duration: number = ANIMATION_DURATIONS.normal,
  easing: string = EASING.easeInOut,
  delay: number = 0
): React.CSSProperties => ({
  transitionDuration: `${duration}ms`,
  transitionTimingFunction: easing,
  transitionDelay: `${delay}ms`
});

// Pre-built animation combinations
export const PRESET_ANIMATIONS = {
  // Card animations
  interactiveCard: combineAnimations(
    ANIMATIONS.cardHover,
    ANIMATIONS.colorTransition,
    ANIMATIONS.focusRing
  ),
  
  // Button animations  
  primaryButton: combineAnimations(
    ANIMATIONS.buttonHover,
    ANIMATIONS.buttonPress,
    ANIMATIONS.colorTransition,
    ANIMATIONS.focusRing
  ),
  
  // Input animations
  formInput: combineAnimations(
    ANIMATIONS.borderGlow,
    ANIMATIONS.colorTransition,
    ANIMATIONS.focusRing
  ),
  
  // List item animations
  listItem: combineAnimations(
    ANIMATIONS.hoverLift,
    ANIMATIONS.colorTransition,
    ANIMATIONS.focusVisible
  ),
  
  // Modal animations
  modalOverlay: combineAnimations(
    ANIMATIONS.modalBackdrop,
    ANIMATIONS.fadeIn
  ),
  
  modalPanel: combineAnimations(
    ANIMATIONS.modalContent,
    ANIMATIONS.modalSlideUp
  )
} as const;

// Animation event handlers
export const createAnimationHandlers = () => ({
  onMouseEnter: (e: React.MouseEvent) => {
    const element = e.currentTarget as HTMLElement;
    element.style.transform = 'translateY(-2px)';
  },
  
  onMouseLeave: (e: React.MouseEvent) => {
    const element = e.currentTarget as HTMLElement;
    element.style.transform = 'translateY(0)';
  },
  
  onFocus: (e: React.FocusEvent) => {
    const element = e.currentTarget as HTMLElement;
    element.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)';
  },
  
  onBlur: (e: React.FocusEvent) => {
    const element = e.currentTarget as HTMLElement;
    element.style.boxShadow = 'none';
  }
});

export default ANIMATIONS;