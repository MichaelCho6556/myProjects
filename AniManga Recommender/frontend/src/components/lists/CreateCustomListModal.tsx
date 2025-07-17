// ABOUTME: Modal component for creating new custom user lists with title, description, and privacy settings
// ABOUTME: Provides form validation and handles list creation workflow with tag management

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuthenticatedApi } from "../../hooks/useAuthenticatedApi";
import { CustomList } from "../../types/social";
import { TagInputComponent } from "./TagInputComponent";
import { logger } from "../../utils/logger";

interface CreateCustomListFormData {
  title: string;
  description: string;
  privacy: "Public" | "Private" | "Friends Only"; // Form still uses display names
}

interface CreateCustomListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateList?: (listData: CustomList) => void;
}

export const CreateCustomListModal: React.FC<CreateCustomListModalProps> = ({
  isOpen,
  onClose,
  onCreateList,
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
  } = useForm<CreateCustomListFormData>({
    defaultValues: {
      title: "",
      description: "",
      privacy: "Public",
    },
  });

  const handleFormSubmit = async (data: CreateCustomListFormData) => {
    if (isLoading) return;

    setIsLoading(true);
    setApiError(null);

    // Transform frontend format to backend format
    const listData = {
      title: data.title,
      description: data.description,
      privacy: data.privacy === "Public" ? "public" : 
               data.privacy === "Friends Only" ? "friends_only" : "private",
      is_collaborative: false, // Default to false for now
      tags: tags,
    };

    try {

      const response = await post("/api/auth/lists/custom", listData);

      // Some endpoints wrap data in { data: {...} }, others return the object directly.
      const created = response?.data ?? response;

      if (created) {
        const transformedList: CustomList = {
          id: created.id.toString(),
          title: created.title,
          description: created.description || "",
          privacy: created.privacy || "private",
          tags: tags,
          createdAt: created.created_at ?? new Date().toISOString(),
          updatedAt: created.updated_at ?? new Date().toISOString(),
          userId: created.user_id,
          username: "", // Placeholder until backend includes username
          itemCount: 0,
          followersCount: 0,
          isFollowing: false,
          items: [],
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
      logger.error("Failed to create list", {
        error: error instanceof Error ? error.message : "Unknown error",
        context: "CreateCustomListModal",
        operation: "onSubmit",
        listTitle: listData.title,
        errorCode: error?.response?.status
      });
      setApiError(error?.response?.data?.message || "Failed to create list");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    reset();
    setTags([]);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0,0,0,0.6)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={handleCancel}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "32rem",
          backgroundColor: "var(--bg-overlay)",
          borderRadius: "8px",
          padding: "2rem",
          color: "var(--text-primary)",
          fontSize: "0.9rem",
          boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1.5rem" }}>Create New List</h2>

        {apiError && <div style={{ color: "#DC2626", marginBottom: "1rem" }}>{apiError}</div>}

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label htmlFor="title">Title</label>
            <input
              id="title"
              type="text"
              {...register("title", { required: "Title is required", maxLength: 100 })}
              style={{
                padding: "0.75rem",
                borderRadius: "6px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-secondary)",
              }}
            />
            {errors.title && (
              <span style={{ color: "#DC2626", fontSize: "0.8rem" }}>{errors.title.message}</span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              rows={3}
              {...register("description", { maxLength: 500 })}
              style={{
                padding: "0.75rem",
                borderRadius: "6px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                resize: "vertical",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <label>Privacy</label>
            <select
              {...register("privacy")}
              style={{
                padding: "0.75rem",
                borderRadius: "6px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
              }}
            >
              <option value="Public">Public</option>
              <option value="Private">Private</option>
              <option value="Friends Only">Friends Only</option>
            </select>
          </div>

          <div>
            <label style={{ marginBottom: "0.5rem", display: "block" }}>Tags</label>
            <TagInputComponent tags={tags} onChange={setTags} />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "transparent",
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "var(--accent-primary)",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
