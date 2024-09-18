import React, { useState, useEffect } from "react";
import styled from "styled-components";
import axios from "axios";

const RecipeList = ({ searchParams, onRecipeSelect }) => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await axios({
          method: "GET",
          url: "https://tasty.p.rapidapi.com/recipes/list",
          params: {
            from: searchParams.from,
            size: searchParams.size,
            tags: searchParams.tags,
            q: searchParams.query,
            sort: searchParams.sort,
          },
          headers: {
            "X-RapidAPI-Key": process.env.REACT_APP_RAPIDAPI_KEY,
            "X-RapidAPI-Host": process.env.REACT_APP_RAPIDAPI_HOST,
          },
        });
        setRecipes(response.data.results); // Assuming the results are in data.results
      } catch (error) {
        console.error("Error fetching recipes:", error);
        setError("Failed to fetch recipes. Please try again.");
      }
      setLoading(false);
    };

    fetchData();
  }, [searchParams]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <RecipeContainer>
      {recipes.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          onClick={() => {
            console.log("Recipe selected:", recipe.id);
            onRecipeSelect(recipe.id);
          }}
        >
          <RecipeTitle>{recipe.name}</RecipeTitle>
          <RecipeDescription>{recipe.description}</RecipeDescription>
          {/* You can include a button or link here that when clicked will take the user to the recipe details */}
        </RecipeCard>
      ))}
    </RecipeContainer>
  );
};

const RecipeContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  padding: 20px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(
      auto-fill,
      minmax(200px, 1fr)
    ); // Adjust grid layout for smaller screens
    padding: 10px;
  }
`;

const RecipeCard = styled.div`
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s; // Smooth transform effect on hover
  cursor: pointer;

  &:hover {
    transform: scale(
      1.05
    ); // Slight scale up on hover for better interaction feedback
  }

  @media (max-width: 768px) {
    padding: 10px; // Reduced padding for smaller screens
  }
`;

const RecipeTitle = styled.h3`
  color: #333;
  margin-bottom: 10px;

  @media (max-width: 768px) {
    font-size: 16px; // Smaller font size for smaller screens
  }
`;

const RecipeDescription = styled.p`
  color: #666;

  @media (max-width: 768px) {
    font-size: 14px; // Smaller font size to ensure text is not cramped
  }
`;

const LoadingMessage = styled.p`
  text-align: center;
  font-size: 18px;
`;

const ErrorMessage = styled(LoadingMessage)`
  color: red;
`;

export default RecipeList;
