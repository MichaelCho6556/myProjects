import React, { useState, useEffect } from "react";
import axios from "axios";
import DocumentView from "./DocumentView";

interface Document {
  id: string;
  filename: string;
  s3Key: string;
  uploadDate: string;
  extractedText: string;
}

const DocumentList: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post("http://localhost:4000/graphql", {
        query: `
          query GetDocuments {
            documents {
              id
              filename
              s3Key
              uploadDate
              extractedText
            }
          }
        `,
      });

      if (response.data.errors) {
        throw new Error(
          response.data.errors[0]?.message || "Failed to fetch documents"
        );
      }

      setDocuments(response.data.data.documents || []);
    } catch (err: any) {
      console.error("Error fetching documents:", err);
      setError(err.message || "Failed to load documents. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentClick = (document: Document) => {
    setSelectedDocument(document);
  };

  // Filter documents based on search term
  const filteredDocuments = documents.filter(
    (doc) =>
      doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.extractedText &&
        doc.extractedText.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Document Library</h2>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search documents..."
            className="border p-2 rounded"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading documents...</div>
      ) : error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
          {error}
          <button className="ml-4 underline" onClick={fetchDocuments}>
            Try again
          </button>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {searchTerm
            ? "No matching documents found."
            : "No documents found. Upload your first document!"}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {filteredDocuments.map((document) => (
            <div
              key={document.id}
              className={`border rounded p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedDocument?.id === document.id
                  ? "border-blue-500 bg-blue-50"
                  : ""
              }`}
              onClick={() => handleDocumentClick(document)}
            >
              <div className="flex items-center">
                {/* File icon based on extension */}
                <div className="mr-3 text-gray-500">
                  {getFileIcon(document.filename)}
                </div>
                <div>
                  <h3 className="font-medium">{document.filename}</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(document.uploadDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedDocument && <DocumentView document={selectedDocument} />}
    </div>
  );
};

// Helper function to get icon based on file extension
function getFileIcon(filename: string) {
  const extension = filename.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "pdf":
      return (
        <span role="img" aria-label="PDF">
          📄
        </span>
      );
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
      return (
        <span role="img" aria-label="Image">
          🖼️
        </span>
      );
    case "docx":
    case "doc":
      return (
        <span role="img" aria-label="Document">
          📝
        </span>
      );
    case "txt":
      return (
        <span role="img" aria-label="Text">
          📋
        </span>
      );
    default:
      return (
        <span role="img" aria-label="File">
          📁
        </span>
      );
  }
}

export default DocumentList;
