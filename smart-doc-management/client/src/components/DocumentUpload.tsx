import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";

const DocumentUpload: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);
    setUploadSuccess(false);

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
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadProgress(percentCompleted);
            }
          },
        }
      );

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      console.log("Upload response:", response.data);
      setUploadSuccess(true);

      // Delay reload slightly to show success message
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      console.error("Error uploading document:", error);
      setError(
        error.response?.data?.error ||
          error.message ||
          "Error uploading document. Please try again."
      );
    } finally {
      setIsUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } =
    useDropzone({
      onDrop,
      accept: {
        "text/plain": [".txt"],
        "application/pdf": [".pdf"],
        "image/*": [".png", ".jpg", ".jpeg", ".gif"],
        "application/msword": [".doc"],
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
          [".docx"],
      },
      maxSize: 10 * 1024 * 1024, // 10MB
      multiple: false,
      disabled: isUploading,
    });

  const selectedFile = acceptedFiles[0];

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4">Upload Document</h2>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-blue-400"
        } ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input {...getInputProps()} />

        {isUploading ? (
          <div>
            <p className="mb-2">Uploading {selectedFile?.name}...</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {uploadProgress}% complete
            </p>
          </div>
        ) : uploadSuccess ? (
          <div className="text-green-600">
            <p>✓ Upload successful! Refreshing page...</p>
          </div>
        ) : isDragActive ? (
          <div>
            <p className="text-lg mb-2">Drop the file here</p>
            <p className="text-sm text-gray-500">
              Your document will be processed with AI text extraction
            </p>
          </div>
        ) : (
          <div>
            <p className="text-lg mb-2">
              Drag & drop a file here, or click to select
            </p>
            <p className="text-sm text-gray-500">
              Supported formats: PDF, Images, Word documents, and text files
              (max 10MB)
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
      )}

      {selectedFile && !isUploading && !uploadSuccess && (
        <div className="mt-4 p-4 bg-gray-50 rounded flex items-center justify-between">
          <div>
            <p className="font-medium">{selectedFile.name}</p>
            <p className="text-sm text-gray-600">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <button
            onClick={() => acceptedFiles.splice(0, acceptedFiles.length)}
            className="text-red-500 hover:text-red-700"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;
