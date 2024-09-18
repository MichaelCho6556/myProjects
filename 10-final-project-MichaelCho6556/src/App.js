import React, { useState, useEffect } from "react";
import axios from "axios";
import styled from "styled-components";
import SearchBar from "./components/SearchBar";
import RecipeList from "./components/RecipeList";
import RecipeDetail from "./components/RecipeDetail";

const App = () => {
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);
  const [recipeDetails, setRecipeDetails] = useState(null);
  const [searchParams, setSearchParams] = useState({
    from: "0",
    size: "20",
    query: "",
  });
  const [showDetails, setShowDetails] = useState(false); // Control the view state

  useEffect(() => {
    if (selectedRecipeId) {
      fetchRecipeDetails(selectedRecipeId);
    }
  }, [selectedRecipeId]);

  const fetchRecipeDetails = async (id) => {
    try {
      const response = await axios({
        method: "GET",
        url: `https://tasty.p.rapidapi.com/recipes/get-more-info`,
        params: { id: id },
        headers: {
          "X-RapidAPI-Key":
            "defb95ebc0mshf805ae80b76285cp1cdcd5jsnb6033326020a",
          "X-RapidAPI-Host": "tasty.p.rapidapi.com",
        },
      });
      setRecipeDetails(response.data);
      setShowDetails(true); // Show details view
      console.log("Details fetched:", response.data);
    } catch (error) {
      console.error("Error fetching recipe details:", error);
    }
  };

  const handleRecipeSelect = (id) => {
    console.log("Selected Recipe ID:", id);
    setSelectedRecipeId(id);
  };

  const setQuery = (query) => {
    setSearchParams((prevParams) => ({
      ...prevParams,
      query,
    }));
  };

  const handleBack = () => {
    setRecipeDetails(null); // Clear the details
    setShowDetails(false); // Go back to list view
  };

  return (
    <AppContainer>
      <AppHeader>
        <AppTitle>Recipe Finder</AppTitle>
      </AppHeader>
      {!showDetails ? (
        <>
          <SearchBar setQuery={setQuery} />
          <RecipeList
            searchParams={searchParams}
            onRecipeSelect={handleRecipeSelect}
          />
        </>
      ) : (
        <RecipeDetail recipe={recipeDetails} onBack={handleBack} />
      )}
    </AppContainer>
  );
};

// Main app container
const AppContainer = styled.div`
  text-align: center;
  background-color: #f8f9fa; // Light grey background
  color: #343a40; // Dark grey text
  font-family: "Arial", sans-serif;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 20px;
`;

// Header style
const AppHeader = styled.header`
  background-color: #007bff; // Bright blue
  width: 100%;
  padding: 20px 0;
  color: white;
`;

// Title style
const AppTitle = styled.h1`
  font-size: calc(12px + 2vmin);
  margin: 0;
`;


export default App;
