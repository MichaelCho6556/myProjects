import { useState } from "react";
import DocumentUpload from "./components/DocumentUpload";
import DocumentList from "./components/DocumentList";

function App() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">
        Smart Document Management System
      </h1>
      <DocumentUpload />
      <DocumentList />
    </div>
  );
}

export default App;
