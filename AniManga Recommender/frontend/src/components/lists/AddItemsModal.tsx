// ABOUTME: Modal component for adding anime/manga items to custom lists with search and selection
// ABOUTME: Provides autocomplete search functionality and batch item addition with validation

import React, { useState, useCallback } from 'react';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useDebounce } from '../../hooks/useDebounce';
import './AddItemsModal.css';

interface SearchResult {
  uid: string;
  title: string;
  mediaType: string;
  imageUrl?: string;
  score?: number;
  year?: number;
}

interface AddItemsModalProps {
  listId: string;
  isOpen: boolean;
  onClose: () => void;
  onItemsAdded: () => void;
}

export const AddItemsModal: React.FC<AddItemsModalProps> = ({
  listId,
  isOpen,
  onClose,
  onItemsAdded
}) => {
  const { get, post } = useAuthenticatedApi();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedItems, setSelectedItems] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const searchItems = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await get(`/api/items?q=${encodeURIComponent(query)}&limit=20`);

      const results = (response.data || response || []).map((item: any) => ({
        uid: item.uid,
        title: item.title,
        mediaType: item.media_type || item.mediaType || 'Unknown',
        imageUrl: item.image_url || item.imageUrl,
        score: item.score,
        year: item.year
      }));

      setSearchResults(results);
    } catch (err) {
      console.error('Search failed:', err);
      setError('Failed to search items. Please try again.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [get]);

  React.useEffect(() => {
    searchItems(debouncedSearchQuery);
  }, [debouncedSearchQuery, searchItems]);

  const handleItemSelect = (item: SearchResult) => {
    const isAlreadySelected = selectedItems.some(selected => selected.uid === item.uid);
    
    if (isAlreadySelected) {
      setSelectedItems(prev => prev.filter(selected => selected.uid !== item.uid));
    } else {
      setSelectedItems(prev => [...prev, item]);
    }
  };

  const handleAddItems = async () => {
    if (selectedItems.length === 0) return;

    setIsAdding(true);
    setError(null);

    try {
      const itemsToAdd = selectedItems.map(item => ({
        item_uid: item.uid,
        notes: ''
      }));

      await post(`/api/auth/lists/${listId}/items/batch`, {
        items: itemsToAdd
      });

      // Show success message briefly before closing
      setSuccessMessage(`Successfully added ${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''} to the list!`);
      
      // Close modal after a brief delay to show success message
      setTimeout(() => {
        onItemsAdded();
        onClose();
        setSelectedItems([]);
        setSearchQuery('');
        setSearchResults([]);
        setSuccessMessage(null);
      }, 1500);
    } catch (err: any) {
      console.error('Failed to add items:', err);
      setError(err.response?.data?.message || 'Failed to add items. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleClose = () => {
    setSelectedItems([]);
    setSearchQuery('');
    setSearchResults([]);
    setError(null);
    setSuccessMessage(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="add-items-modal-overlay" onClick={handleClose}>
      <div className="add-items-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add Items to List</h2>
          <button className="modal-close" onClick={handleClose}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-content">
          {/* Search Section */}
          <div className="search-section">
            <div className="search-input-container">
              <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search anime or manga..."
                className="search-input"
                autoFocus
              />
              {isSearching && (
                <div className="search-spinner">
                  <div className="spinner"></div>
                </div>
              )}
            </div>
          </div>

          {/* Selected Items */}
          {selectedItems.length > 0 && (
            <div className="selected-section">
              <h3 className="section-title">
                Selected Items ({selectedItems.length})
              </h3>
              <div className="selected-items">
                {selectedItems.map(item => (
                  <div key={item.uid} className="selected-item">
                    <img 
                      src={item.imageUrl || '/images/default.webp'} 
                      alt={item.title}
                      className="item-image"
                    />
                    <div className="item-info">
                      <span className="item-title">{item.title}</span>
                      <span className="item-type">{item.mediaType}</span>
                    </div>
                    <button
                      onClick={() => handleItemSelect(item)}
                      className="remove-btn"
                      title="Remove from selection"
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          <div className="results-section">
            {searchQuery.length >= 2 && (
              <h3 className="section-title">
                Search Results {searchResults.length > 0 && `(${searchResults.length})`}
              </h3>
            )}
            
            {error && (
              <div className="error-message">
                <strong>Search Error:</strong> {error}
              </div>
            )}

            {successMessage && (
              <div className="success-message">
                <strong>Success:</strong> {successMessage}
              </div>
            )}

            {searchQuery.length < 2 && (
              <div className="empty-state">
                <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p>Start typing to search for anime or manga</p>
                <p className="text-sm">Search by title, such as "One Piece" or "Naruto"</p>
              </div>
            )}

            {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && !error && (
              <div className="empty-state">
                <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.467.881-6.077 2.33l-.922-.664C6.772 15.049 9.318 14 12 14s5.228 1.049 6.999 2.666l-.922.664zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>No items found matching "{searchQuery}"</p>
                <p className="text-sm">Try different keywords or check spelling</p>
              </div>
            )}

            <div className="search-results">
              {searchResults.map(item => {
                const isSelected = selectedItems.some(selected => selected.uid === item.uid);
                return (
                  <div 
                    key={item.uid} 
                    className={`result-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleItemSelect(item)}
                  >
                    <img 
                      src={item.imageUrl || '/images/default.webp'} 
                      alt={item.title}
                      className="item-image"
                    />
                    <div className="item-info">
                      <div className="item-title">{item.title}</div>
                      <div className="item-meta">
                        <span className="item-type">{item.mediaType}</span>
                        {item.year && <span className="item-year">{item.year}</span>}
                        {item.score && <span className="item-score">★ {item.score}</span>}
                      </div>
                    </div>
                    <div className="selection-indicator">
                      {isSelected ? (
                        <svg fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                      ) : (
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <button
            onClick={handleClose}
            className="btn btn-secondary"
            disabled={isAdding}
          >
            Cancel
          </button>
          <button
            onClick={handleAddItems}
            className="btn btn-primary"
            disabled={selectedItems.length === 0 || isAdding}
          >
            {isAdding ? (
              <>
                <div className="spinner"></div>
                Adding...
              </>
            ) : (
              `Add ${selectedItems.length} Item${selectedItems.length !== 1 ? 's' : ''}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};