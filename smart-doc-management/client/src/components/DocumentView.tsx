import React, { useState, useEffect } from "react";

interface Document {
  id: string;
  filename: string;
  s3Key: string;
  uploadDate: string;
}

interface Props {
  document: Document;
}

const DocumentView: React.FC<Props> = ({ document }) => {
  const { filename, s3Key } = document;
  const fileExtension = filename.split(".").pop()?.toLowerCase();
  const s3Url = `https://smart-doc-management-project.s3.amazonaws.com/${s3Key}`;

  const [textContent, setTextContent] = useState<string>("");

  useEffect(() => {
    if (fileExtension === "txt") {
      fetch(s3Url)
        .then((response) => response.text())
        .then((data) => setTextContent(data))
        .catch((error) => {
          console.error("Error fetching .txt file:", error);
          setTextContent("Error loading text file.");
        });
    }
  }, [s3Url, fileExtension]);

  if (
    fileExtension === "jpg" ||
    fileExtension === "jpeg" ||
    fileExtension === "png" ||
    fileExtension === "gif"
  ) {
    // Render an image
    return <img src={s3Url} alt={filename} className="max-w-full" />;
  } else if (fileExtension === "txt") {
    // Render fetched text in a pre block
    return <pre>{textContent}</pre>;
  } else if (fileExtension === "pdf") {
    // Render a PDF in an iframe
    return (
      <iframe
        src={s3Url}
        title={filename}
        width="600"
        height="400"
        style={{ border: "none" }}
      />
    );
  } else {
    return <p>Unsupported file type</p>;
  }
};

export default DocumentView;
