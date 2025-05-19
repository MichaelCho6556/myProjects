// frontend/src/App.js
import React from "react";
import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ItemDetailPage from "./pages/ItemDetailPage";
import Navbar from "./components/Navbar";
import "./App.css";

function App() {
  return (
    <div className="App">
      <Navbar />

      <div className="app-container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/item/:uid" element={<ItemDetailPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
