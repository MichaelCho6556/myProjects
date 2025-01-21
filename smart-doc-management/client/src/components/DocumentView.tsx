import React, { useState } from "react";

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

  const copyText = () => {
    navigator.clipboard.writeText(document.extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fileExtension = document.filename.split(".").pop()?.toLowerCase();
  const s3Url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${document.s3Key}`;

  return (
    <div className="document-viewer mt-4">
      <div className="tabs mb-4">
        <button
          className={`px-4 py-2 ${
            activeTab === "preview" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
          onClick={() => setActiveTab("preview")}
        >
          Preview
        </button>
        <button
          className={`px-4 py-2 ${
            activeTab === "text" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
          onClick={() => setActiveTab("text")}
        >
          Extracted Text
        </button>
      </div>

      {activeTab === "preview" ? (
        // Original preview logic
        fileExtension === "pdf" ? (
          <iframe
            src={s3Url}
            title={document.filename}
            className="w-full h-96"
          />
        ) : ["jpg", "jpeg", "png", "gif"].includes(fileExtension!) ? (
          <img src={s3Url} alt={document.filename} className="max-w-full" />
        ) : (
          <p>Preview not available</p>
        )
      ) : (
        // Extracted text display
        <div className="relative bg-gray-100 p-4 rounded">
          <pre className="whitespace-pre-wrap">
            {document.extractedText || "No text extracted"}
          </pre>
          {document.extractedText && (
            <button
              onClick={copyText}
              className="absolute top-2 right-2 bg-blue-500 text-white px-3 py-1 rounded text-sm"
            >
              {copied ? "Copied!" : "Copy Text"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentView;
