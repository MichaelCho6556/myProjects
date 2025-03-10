import React, { useState } from "react";
import axios from "axios";

interface Document {
  id: string;
  filename: string;
  s3Key: string;
  uploadDate: string;
  extractedText: string;
}

interface Props {
  document: Document;
}

const DocumentView: React.FC<Props> = ({ document }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"preview" | "text">("preview");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copyText = () => {
    if (!document.extractedText) return;

    navigator.clipboard.writeText(document.extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fileExtension = document.filename.split(".").pop()?.toLowerCase();

  const getFileUrl = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        "http://localhost:4000/file/${document.s3Key}"
      );
      return response.data.url;
    } catch (err) {
      console.error("Error fetching file URL:", err);
      setError("Failed to load preview. Please try again.");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviewClick = async () => {
    setActiveTab("preview");
  };

  return (
    <div className="document-viewer mt-4 border rounded-lg overflow-hidden">
      <div className="document-header bg-gray-100 p-4 border-b">
        <h3 className="font-semibold text-lg">{document.filename}</h3>
        <p className="text-sm text-gray-600">
          Uploaded: {new Date(document.uploadDate).toLocaleDateString()}
        </p>
      </div>

      <div className="tabs flex">
        <button
          className={`px-6 py-3 flex-1 font-medium ${
            activeTab === "preview"
              ? "bg-blue-500 text-white"
              : "bg-gray-200 hover:bg-gray-300"
          }`}
          onClick={handlePreviewClick}
        >
          Preview
        </button>
        <button
          className={`px-6 py-3 flex-1 font-medium ${
            activeTab === "text"
              ? "bg-blue-500 text-white"
              : "bg-gray-200 hover:bg-gray-300"
          }`}
          onClick={() => setActiveTab("text")}
        >
          Extracted Text
        </button>
      </div>

      <div className="p-4">
        {activeTab === "preview" ? (
          <div className="preview-container">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <p>Loading preview...</p>
              </div>
            ) : error ? (
              <div className="text-red-500 text-center p-4">{error}</div>
            ) : (
              <div className="text-center">
                <p className="mb-4">Preview not available directly.</p>
                <a
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  href={`http://localhost:4000/file/${document.s3Key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download File
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="relative bg-gray-50 p-4 rounded min-h-64">
            {document.extractedText ? (
              <>
                <pre className="whitespace-pre-wrap font-sans text-sm">
                  {document.extractedText}
                </pre>
                <button
                  onClick={copyText}
                  className="absolute top-2 right-2 bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                >
                  {copied ? "Copied!" : "Copy Text"}
                </button>
              </>
            ) : (
              <div className="text-center text-gray-500 py-8">
                No text was extracted from this document.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentView;
