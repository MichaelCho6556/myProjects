"""
Batch Operations Utility Module
Handles bulk operations on custom list items with comprehensive error handling and logging.
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone
from supabase import Client
from enum import Enum
import psycopg2
from psycopg2.extras import RealDictCursor, execute_values
import json
from utils.cache_helpers import invalidate_list_cache, invalidate_user_lists_cache

logger = logging.getLogger(__name__)

class BatchOperationType(Enum):
    BULK_STATUS_UPDATE = 'bulk_status_update'
    BULK_ADD_TAGS = 'bulk_add_tags'
    BULK_REMOVE_TAGS = 'bulk_remove_tags'
    BULK_RATING_UPDATE = 'bulk_rating_update'
    BULK_REMOVE = 'bulk_remove'
    BULK_COPY_TO_LIST = 'bulk_copy_to_list'
    BULK_MOVE_TO_POSITION = 'bulk_move_to_position'

class BatchOperationResult:
    def __init__(self, success: bool, affected_count: int, message: str, errors: List[str] = None):
        self.success = success
        self.affected_count = affected_count
        self.message = message
        self.errors = errors or []

    def to_dict(self) -> Dict[str, Any]:
        return {
            'success': self.success,
            'affected_count': self.affected_count,
            'message': self.message,
            'errors': self.errors
        }

class BatchOperationError(Exception):
    """Custom exception for batch operation errors"""
    pass

class BatchOperationsManager:
    def __init__(self, db_connection, cache_client=None):
        self.db = db_connection
        self.cache = cache_client  # Now expects hybrid cache instance
        
    def perform_batch_operation(self, user_id: str, list_id: str, operation_type: str, 
                              item_ids: List[str], operation_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Perform a batch operation on list items with proper transaction handling
        """
        try:
            with self.db.cursor(cursor_factory=RealDictCursor) as cursor:
                # Begin transaction
                cursor.execute("BEGIN")
                
                # Verify list ownership
                cursor.execute(
                    "SELECT id, user_id FROM custom_lists WHERE id = %s AND user_id = %s",
                    (list_id, user_id)
                )
                list_data = cursor.fetchone()
                if not list_data:
                    raise BatchOperationError("List not found or access denied")
                
                # Verify item ownership in the list
                placeholders = ','.join(['%s'] * len(item_ids))
                cursor.execute(f"""
                    SELECT id FROM custom_custom_list_items 
                    WHERE list_id = %s AND id IN ({placeholders})
                """, [list_id] + item_ids)
                
                existing_items = [row['id'] for row in cursor.fetchall()]
                if len(existing_items) != len(item_ids):
                    missing_items = set(item_ids) - set(str(item['id']) for item in existing_items)
                    raise BatchOperationError(f"Items not found in list: {missing_items}")
                
                # Perform operation based on type
                result = self._execute_batch_operation(cursor, operation_type, list_id, item_ids, operation_data)
                
                # Log the batch operation
                self._log_batch_operation(cursor, user_id, list_id, operation_type, item_ids, operation_data)
                
                # Commit transaction
                cursor.execute("COMMIT")
                
                # Invalidate caches
                self._invalidate_caches(list_id, user_id)
                
                return {
                    "success": True,
                    "operation_type": operation_type,
                    "affected_items": len(item_ids),
                    "result": result,
                    "timestamp": datetime.utcnow().isoformat()
                }
                
        except Exception as e:
            # Rollback on error
            try:
                cursor.execute("ROLLBACK")
            except:
                pass
            
            logger.error(f"Batch operation failed: {str(e)}", exc_info=True)
            raise BatchOperationError(f"Batch operation failed: {str(e)}")
    
    def _execute_batch_operation(self, cursor, operation_type: str, list_id: str, 
                               item_ids: List[str], operation_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the specific batch operation"""
        
        if operation_type == "bulk_status_update":
            return self._bulk_status_update(cursor, list_id, item_ids, operation_data.get('status'))
            
        elif operation_type == "bulk_rating_update":
            return self._bulk_rating_update(cursor, list_id, item_ids, operation_data.get('rating'))
            
        elif operation_type == "bulk_add_tags":
            return self._bulk_add_tags(cursor, list_id, item_ids, operation_data.get('tags', []))
            
        elif operation_type == "bulk_remove_tags":
            return self._bulk_remove_tags(cursor, list_id, item_ids, operation_data.get('tags', []))
            
        elif operation_type == "bulk_copy_to_list":
            return self._bulk_copy_to_list(cursor, item_ids, operation_data.get('targetListId'))
            
        elif operation_type == "bulk_move_to_position":
            return self._bulk_move_to_position(cursor, list_id, item_ids, operation_data.get('position'))
            
        elif operation_type == "bulk_remove":
            return self._bulk_remove_items(cursor, list_id, item_ids)
            
        else:
            raise BatchOperationError(f"Unknown operation type: {operation_type}")
    
    def _bulk_status_update(self, cursor, list_id: str, item_ids: List[str], status: str) -> Dict[str, Any]:
        """Update watch status for multiple items"""
        if not status:
            raise BatchOperationError("Status is required")
            
        valid_statuses = ['plan_to_watch', 'watching', 'completed', 'on_hold', 'dropped']
        if status not in valid_statuses:
            raise BatchOperationError(f"Invalid status: {status}")
        
        # Update the status using JSON operations to modify personal_data
        placeholders = ','.join(['%s'] * len(item_ids))
        cursor.execute(f"""
            UPDATE custom_custom_list_items 
            SET personal_data = COALESCE(personal_data, '{{}}')::jsonb || %s::jsonb,
                updated_at = NOW()
            WHERE list_id = %s AND id IN ({placeholders})
        """, [json.dumps({'watchStatus': status}), list_id] + item_ids)
        
        return {"updated_count": cursor.rowcount, "status": status}
    
    def _bulk_rating_update(self, cursor, list_id: str, item_ids: List[str], rating: float) -> Dict[str, Any]:
        """Update personal rating for multiple items"""
        if rating is None or rating < 0 or rating > 10:
            raise BatchOperationError("Rating must be between 0 and 10")
        
        placeholders = ','.join(['%s'] * len(item_ids))
        cursor.execute(f"""
            UPDATE custom_custom_list_items 
            SET personal_data = COALESCE(personal_data, '{{}}')::jsonb || %s::jsonb,
                updated_at = NOW()
            WHERE list_id = %s AND id IN ({placeholders})
        """, [json.dumps({'personalRating': rating}), list_id] + item_ids)
        
        return {"updated_count": cursor.rowcount, "rating": rating}
    
    def _bulk_add_tags(self, cursor, list_id: str, item_ids: List[str], tags: List[str]) -> Dict[str, Any]:
        """Add tags to multiple items"""
        if not tags:
            raise BatchOperationError("At least one tag is required")
        
        # Clean and validate tags
        clean_tags = [tag.strip().lower() for tag in tags if tag.strip()]
        if not clean_tags:
            raise BatchOperationError("No valid tags provided")
        
        updated_count = 0
        for item_id in item_ids:
            # Get current tags
            cursor.execute(
                "SELECT personal_data FROM custom_list_items WHERE list_id = %s AND id = %s",
                (list_id, item_id)
            )
            row = cursor.fetchone()
            current_data = row['personal_data'] if row and row['personal_data'] else {}
            current_tags = current_data.get('customTags', [])
            
            # Add new tags (avoid duplicates)
            new_tags = list(set(current_tags + clean_tags))
            
            # Limit to 10 tags max
            if len(new_tags) > 10:
                new_tags = new_tags[:10]
            
            # Update the item
            updated_data = {**current_data, 'customTags': new_tags}
            cursor.execute(
                "UPDATE custom_list_items SET personal_data = %s, updated_at = NOW() WHERE list_id = %s AND id = %s",
                (json.dumps(updated_data), list_id, item_id)
            )
            updated_count += cursor.rowcount
        
        return {"updated_count": updated_count, "tags_added": clean_tags}
    
    def _bulk_remove_tags(self, cursor, list_id: str, item_ids: List[str], tags: List[str]) -> Dict[str, Any]:
        """Remove tags from multiple items"""
        if not tags:
            raise BatchOperationError("At least one tag is required")
        
        tags_to_remove = [tag.strip().lower() for tag in tags if tag.strip()]
        if not tags_to_remove:
            raise BatchOperationError("No valid tags provided")
        
        updated_count = 0
        for item_id in item_ids:
            # Get current tags
            cursor.execute(
                "SELECT personal_data FROM custom_list_items WHERE list_id = %s AND id = %s",
                (list_id, item_id)
            )
            row = cursor.fetchone()
            current_data = row['personal_data'] if row and row['personal_data'] else {}
            current_tags = current_data.get('customTags', [])
            
            # Remove specified tags
            new_tags = [tag for tag in current_tags if tag not in tags_to_remove]
            
            # Update only if tags changed
            if len(new_tags) != len(current_tags):
                updated_data = {**current_data, 'customTags': new_tags}
                cursor.execute(
                    "UPDATE custom_list_items SET personal_data = %s, updated_at = NOW() WHERE list_id = %s AND id = %s",
                    (json.dumps(updated_data), list_id, item_id)
                )
                updated_count += cursor.rowcount
        
        return {"updated_count": updated_count, "tags_removed": tags_to_remove}
    
    def _bulk_copy_to_list(self, cursor, item_ids: List[str], target_list_id: str) -> Dict[str, Any]:
        """Copy items to another list"""
        if not target_list_id:
            raise BatchOperationError("Target list ID is required")
        
        # Verify target list exists
        cursor.execute("SELECT id FROM custom_lists WHERE id = %s", (target_list_id,))
        if not cursor.fetchone():
            raise BatchOperationError("Target list not found")
        
        # Get max position in target list
        cursor.execute(
            "SELECT COALESCE(MAX(position), 0) as max_pos FROM custom_list_items WHERE list_id = %s",
            (target_list_id,)
        )
        max_position = cursor.fetchone()['max_pos']
        
        # Copy items
        placeholders = ','.join(['%s'] * len(item_ids))
        cursor.execute(f"""
            INSERT INTO custom_list_items (list_id, item_uid, title, media_type, image_url, position, personal_data, created_at)
            SELECT %s, item_uid, title, media_type, image_url, 
                   ROW_NUMBER() OVER() + %s as position,
                   personal_data, NOW()
            FROM custom_list_items 
            WHERE id IN ({placeholders})
            ON CONFLICT (list_id, item_uid) DO NOTHING
        """, [target_list_id, max_position] + item_ids)
        
        copied_count = cursor.rowcount
        
        # Update target list item count
        cursor.execute(
            "UPDATE custom_lists SET item_count = item_count + %s, updated_at = NOW() WHERE id = %s",
            (copied_count, target_list_id)
        )
        
        return {"copied_count": copied_count, "target_list_id": target_list_id}
    
    def _bulk_move_to_position(self, cursor, list_id: str, item_ids: List[str], position: int) -> Dict[str, Any]:
        """Move items to a specific position"""
        if position < 0:
            # Move to end
            cursor.execute(
                "SELECT COALESCE(MAX(position), 0) as max_pos FROM custom_list_items WHERE list_id = %s",
                (list_id,)
            )
            position = cursor.fetchone()['max_pos'] + 1
        
        # Update positions for moved items
        placeholders = ','.join(['%s'] * len(item_ids))
        cursor.execute(f"""
            UPDATE custom_list_items 
            SET position = %s + ROW_NUMBER() OVER() - 1,
                updated_at = NOW()
            WHERE list_id = %s AND id IN ({placeholders})
        """, [position, list_id] + item_ids)
        
        # Reorder other items to maintain sequence
        cursor.execute("""
            WITH numbered_items AS (
                SELECT id, ROW_NUMBER() OVER (ORDER BY position, id) as new_pos
                FROM custom_list_items 
                WHERE list_id = %s
            )
            UPDATE custom_list_items 
            SET position = numbered_items.new_pos
            FROM numbered_items 
            WHERE custom_list_items.id = numbered_items.id
        """, (list_id,))
        
        return {"moved_count": len(item_ids), "new_position": position}
    
    def _bulk_remove_items(self, cursor, list_id: str, item_ids: List[str]) -> Dict[str, Any]:
        """Remove items from the list"""
        placeholders = ','.join(['%s'] * len(item_ids))
        cursor.execute(f"""
            DELETE FROM custom_list_items 
            WHERE list_id = %s AND id IN ({placeholders})
        """, [list_id] + item_ids)
        
        removed_count = cursor.rowcount
        
        # Update list item count
        cursor.execute(
            "UPDATE custom_lists SET item_count = item_count - %s, updated_at = NOW() WHERE id = %s",
            (removed_count, list_id)
        )
        
        # Reorder remaining items
        cursor.execute("""
            WITH numbered_items AS (
                SELECT id, ROW_NUMBER() OVER (ORDER BY position, id) as new_pos
                FROM custom_list_items 
                WHERE list_id = %s
            )
            UPDATE custom_list_items 
            SET position = numbered_items.new_pos
            FROM numbered_items 
            WHERE custom_list_items.id = numbered_items.id
        """, (list_id,))
        
        return {"removed_count": removed_count}
    
    def _log_batch_operation(self, cursor, user_id: str, list_id: str, operation_type: str, 
                           item_ids: List[str], operation_data: Dict[str, Any]):
        """Log the batch operation for analytics"""
        try:
            cursor.execute("""
                INSERT INTO batch_operations 
                (user_id, list_id, operation_type, item_ids, operation_data, created_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
            """, (
                user_id, 
                list_id, 
                operation_type, 
                json.dumps(item_ids), 
                json.dumps(operation_data)
            ))
        except Exception as e:
            logger.warning(f"Failed to log batch operation: {e}")
    
    def _invalidate_caches(self, list_id: str, user_id: str):
        """Invalidate relevant caches after batch operation"""
        try:
            # Invalidate list cache using cache helper functions
            # This will handle list details, items, and analytics cache
            invalidate_list_cache(int(list_id), user_id)
            
            # Note: invalidate_list_cache already calls invalidate_user_lists_cache
            # when user_id is provided, so we don't need to call it separately
            
        except Exception as e:
            logger.warning(f"Failed to invalidate caches: {e}")

def create_batch_operations_manager(db_connection, cache_client=None):
    """Factory function to create a BatchOperationsManager instance"""
    return BatchOperationsManager(db_connection, cache_client) 