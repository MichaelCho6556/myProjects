// frontend/src/App.js
import React from "react";
import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ItemDetailPage from "./pages/ItemDetailPage";
import "./App.css";

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>AniManga Recommender</h1>
      </header>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/item/:uid" element={<ItemDetailPage />} />
      </Routes>
    </div>
  );
}

export default App;
