// ABOUTME: Modal component for creating new custom user lists with title, description, and privacy settings
// ABOUTME: Provides form validation and handles list creation workflow with tag management

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { TagInputComponent } from './TagInputComponent';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { CustomList } from '../../types/social';

interface CreateCustomListFormData {
  title: string;
  description: string;
  privacy: 'Public' | 'Private' | 'Friends Only';
}

interface CreateCustomListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateList?: (listData: CustomList) => void;
}

export const CreateCustomListModal: React.FC<CreateCustomListModalProps> = ({ 
  isOpen, 
  onClose, 
  onCreateList 
}) => {
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const { post } = useAuthenticatedApi();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<CreateCustomListFormData>({
    defaultValues: {
      title: '',
      description: '',
      privacy: 'Public'
    }
  });

  const watchedTitle = watch('title');
  const watchedDescription = watch('description');

  const handleFormSubmit = async (data: CreateCustomListFormData) => {
    if (isLoading) return;

    setIsLoading(true);
    setApiError(null);

    try {
      // Transform frontend format to backend format
      const listData = {
        title: data.title,
        description: data.description,
        is_public: data.privacy === 'Public',
        is_collaborative: false, // Default to false for now
        tags: tags
      };

      const response = await post('/api/auth/lists/custom', listData);
      
      if (response.data) {
        // Transform backend response to frontend format
        const transformedList: CustomList = {
          id: response.data.id.toString(),
          title: response.data.title,
          description: response.data.description || '',
          privacy: response.data.is_public ? 'Public' : 'Private',
          tags: tags, // Tags from form since backend might not return them immediately
          createdAt: response.data.created_at,
          updatedAt: response.data.updated_at,
          userId: response.data.user_id,
          username: '', // Would need to be fetched separately or provided by backend
          itemCount: 0,
          followersCount: 0,
          isFollowing: false,
          items: []
        };
        
        // Reset form and close modal
        reset();
        setTags([]);
        onClose();
        
        // Notify parent component
        if (onCreateList) {
          onCreateList(transformedList);
        }
      }
    } catch (error: any) {
      console.error('Failed to create list:', error);
      setApiError(
        error.response?.data?.message || 
        error.message || 
        'Failed to create list. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    reset();
    setTags([]);
    setApiError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Create Custom List
            </h2>
            <button
              type="button"
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 space-y-6">
            {/* API Error */}
            {apiError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800 dark:text-red-200">{apiError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Title Field */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                List Title *
              </label>
              <input
                type="text"
                id="title"
                {...register('title', {
                  required: 'Title is required',
                  maxLength: {
                    value: 100,
                    message: 'Title must be less than 100 characters'
                  },
                  minLength: {
                    value: 3,
                    message: 'Title must be at least 3 characters'
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter list title..."
              />
              <div className="flex justify-between mt-1">
                <div>
                  {errors.title && (
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.title.message}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{watchedTitle.length}/100</p>
                </div>
              </div>
            </div>

            {/* Description Field */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                id="description"
                {...register('description', {
                  maxLength: {
                    value: 500,
                    message: 'Description must be less than 500 characters'
                  }
                })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Describe your list..."
              />
              <div className="flex justify-between mt-1">
                <div>
                  {errors.description && (
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.description.message}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{watchedDescription.length}/500</p>
                </div>
              </div>
            </div>

            {/* Privacy Field */}
            <div>
              <label htmlFor="privacy" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Privacy Setting *
              </label>
              <select
                id="privacy"
                {...register('privacy', { required: 'Privacy setting is required' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Public">Public - Anyone can view</option>
                <option value="Friends Only">Friends Only - Only followers can view</option>
                <option value="Private">Private - Only you can view</option>
              </select>
              {errors.privacy && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.privacy.message}</p>
              )}
            </div>

            {/* Tags Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags
              </label>
              <TagInputComponent
                tags={tags}
                onChange={setTags}
                maxTags={5}
                placeholder="Add tags to help others discover your list..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || Object.keys(errors).length > 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </span>
              ) : (
                'Create List'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};