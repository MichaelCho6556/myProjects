import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";

const DocumentUpload: React.FC = () => {
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(
        "http://localhost:4000/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          withCredentials: true,
        }
      );

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      console.log("Upload response:", response.data);
      alert("Document uploaded successfully");
      window.location.reload();
    } catch (error: any) {
      console.error("Error uploading document:", error);
      alert(
        error.response?.data?.error ||
          "Error uploading document. Please try again."
      );
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/plain": [".txt"],
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg", ".gif"],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  return (
    <div
      {...getRootProps()}
      className="border-2 border-dashed border-gray-400 p-8 text-center cursor-pointer hover:border-blue-500"
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <p>Drop the files here ...</p>
      ) : (
        <p>Drag 'n' drop some files here, or click to select files</p>
      )}
    </div>
  );
};

export default DocumentUpload;
