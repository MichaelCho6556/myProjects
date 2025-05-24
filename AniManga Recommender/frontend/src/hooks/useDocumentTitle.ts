/**
 * useDocumentTitle Hook
 * Custom hook for managing document title with TypeScript support
 */

import { useEffect } from "react";
import { UseDocumentTitle } from "../types";

/**
 * Custom hook to update the document title
 *
 * @param title - The title to set for the document
 */
const useDocumentTitle: UseDocumentTitle = (title: string): void => {
  useEffect(() => {
    // Store the original title to restore if needed
    const originalTitle = document.title;

    // Update the document title
    document.title = title;

    // Cleanup function to restore original title if component unmounts
    return () => {
      document.title = originalTitle;
    };
  }, [title]);
};

export default useDocumentTitle;
