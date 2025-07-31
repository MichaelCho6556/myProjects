import React, { createContext, useState, useContext, useCallback, ReactNode } from "react";

interface LoadingContextType {
  isLoading: boolean;
  loadingMessage: string;
  showLoader: (message?: string) => void;
  hideLoader: () => void;
  setLoadingMessage: (message: string) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
};

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [loadingRequests, setLoadingRequests] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("Loading...");

  // Use a counter to handle overlapping async requests
  const showLoader = useCallback((message: string = "Loading...") => {
    setLoadingMessage(message);
    setLoadingRequests(prev => prev + 1);
  }, []);

  const hideLoader = useCallback(() => {
    setLoadingRequests(prev => Math.max(0, prev - 1));
  }, []);

  const isLoading = loadingRequests > 0;

  const value: LoadingContextType = {
    isLoading,
    loadingMessage,
    showLoader,
    hideLoader,
    setLoadingMessage,
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
};