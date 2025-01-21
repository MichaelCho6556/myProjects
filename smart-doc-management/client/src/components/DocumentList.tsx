import React, { useState, useEffect } from "react";
import axios from "axios";
import DocumentView from "./DocumentView";

// Update the Document interface to include extractedText
interface Document {
  id: string;
  filename: string;
  s3Key: string;
  uploadDate: string;
  extractedText: string; // Add this line
}

const DocumentList: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null
  );

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await axios.post("http://localhost:4000/graphql", {
          query: `
            query GetDocuments {
              documents {
                id
                filename
                s3Key
                uploadDate
                extractedText  // Add this to the query
              }
            }
          `,
        });
        setDocuments(response.data.data.documents);
      } catch (error) {
        console.error("Error fetching documents:", error);
      }
    };

    fetchDocuments();
  }, []);

  const handleDocumentClick = (document: Document) => {
    setSelectedDocument(document);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Document List</h2>
      <ul>
        {documents.map((document) => (
          <li
            key={document.id}
            className="mb-2 cursor-pointer"
            onClick={() => handleDocumentClick(document)}
          >
            {document.filename} - Uploaded on:{" "}
            {new Date(document.uploadDate).toLocaleDateString()}
          </li>
        ))}
      </ul>
      {selectedDocument && <DocumentView document={selectedDocument} />}
    </div>
  );
};

export default DocumentList;
