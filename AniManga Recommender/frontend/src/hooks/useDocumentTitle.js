import { useEffect } from "react";

const useDocumentTitle = (title) => {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    // Cleanup function to restore previous title if needed
    return () => {
      document.title = prevTitle;
    };
  }, [title]);
};

export default useDocumentTitle;
