import React, { useState, useEffect } from "react";
import styled from "styled-components";
import axios from "axios";
import { debounce } from "lodash";

const SearchBar = ({ setQuery }) => {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState("");

  const fetchAutocomplete = debounce((searchText) => {
    if (searchText.length > 2) {
      axios({
        method: "GET",
        url: "https://tasty.p.rapidapi.com/recipes/auto-complete",
        params: { prefix: searchText },
        headers: {
          "X-RapidAPI-Key": process.env.REACT_APP_RAPIDAPI_KEY,
          "X-RapidAPI-Host": process.env.REACT_APP_RAPIDAPI_HOST,
        },
      })
        .then((response) => {
          console.log("API Response:", response.data); // Continue to log data for verification
          setSuggestions(response.data.results); // Adjusted to target the results array
          setError("");
        })
        .catch((error) => {
          console.error("Error fetching autocomplete suggestions:", error);
          setError(
            "Failed to fetch suggestions. Please check your network and API settings."
          );
        });
    } else {
      setSuggestions([]);
    }
  }, 500); // Debouncing for 500 milliseconds

  useEffect(() => {
    fetchAutocomplete(input);
  }, [input]);

  return (
    <SearchContainer>
      <SearchInput
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Search recipes..."
      />
      <SuggestionsList>
        {suggestions.map((suggestion, index) => (
          <SuggestionItem
            key={index}
            onClick={() => {
              setQuery(suggestion.search_value);
              setInput(suggestion.display); // Update the input to show the selected suggestion's display text
              setSuggestions([]); // Clear the suggestions once an item is clicked
            }}
          >
            {suggestion.display}
          </SuggestionItem>
        ))}
      </SuggestionsList>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </SearchContainer>
  );
};

const SearchContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;

  @media (max-width: 768px) {
    padding: 10px; // Reduce padding on smaller screens
  }
`;

const SearchInput = styled.input`
  width: 80%;
  padding: 10px;
  font-size: 16px;
  margin-bottom: 10px;
  border: 2px solid #ccc;
  border-radius: 4px;

  @media (max-width: 768px) {
    width: 95%; // Increase width for smaller screens for better usability
    font-size: 14px; // Slightly reduce font size on small devices
  }
`;

const SuggestionsList = styled.ul`
  list-style-type: none;
  padding: 0;
  width: 80%;
  background: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin: 0;
  border: 1px solid #ddd;
  border-radius: 4px;

  @media (max-width: 768px) {
    width: 95%; // Expand the suggestions list to better use available screen space
  }
`;

const SuggestionItem = styled.li`
  padding: 10px 20px;
  cursor: pointer;
  border-bottom: 1px solid #ddd;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: #f7f7f7;
  }

  @media (max-width: 768px) {
    padding: 8px 15px; // Adjust padding to be more suitable for touch interactions
  }
`;

export default SearchBar;
