import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";
import ItemCard from "./components/ItemCard";

const API_BASE_URL = "http://localhost:5000/api";

function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(
          `${API_BASE_URL}/items?page=1&per_page=30`
        );
        console.log(
          "Raw API Response data property type:",
          typeof response.data
        );
        console.log("Raw API Response data:", response.data);

        let responseData = response.data;
        if (typeof responseData === "string") {
          try {
            responseData = JSON.parse(responseData);
          } catch (parseError) {
            console.error("Failed to parse response data as JSON:", parseError);
            setItems([]);
            setError("Receioved data from server, but it was not valid JSON.");
            setLoading(false);
            return;
          }
        }

        console.log("Parsed Response Data:", responseData);

        if (response.data && Array.isArray(response.data.items)) {
          setItems(response.data.items);
        } else {
          console.error("Unexpected API response structure:", response.data);
          setItems([]);
          setError("Received an unexpected data structure from the server.");
        }
      } catch (err) {
        console.error("Failed to fetch items:", err);
        setItems([]);
        setError(
          err.message || "Failed to fetch items. Is the backend running?"
        );
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>AniManga Recommender</h1>
      </header>
      <main>
        {loading && <p>Loading Items...</p>}
        {error && <p style={{ color: "red" }}>Error: {error}</p>}
        {!loading && !error && (
          <div className="item-list">
            {Array.isArray(items) && items.length > 0 ? (
              items.map((item) => <ItemCard key={item.uid} item={item} />)
            ) : (
              <p>No items found or data is not in the expected format.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
