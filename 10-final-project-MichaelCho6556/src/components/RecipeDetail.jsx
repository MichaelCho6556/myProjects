import React from "react";
import styled from "styled-components";

const RecipeDetail = ({ recipe, onBack }) => {
  if (!recipe) {
    return <div>No recipe details available.</div>;
  }

  return (
    <DetailContainer>
      <Header>{recipe.name}</Header>
      <RecipeImage
        src={recipe.thumbnail_url}
        alt={recipe.thumbnail_alt_text || "Recipe image"}
      />
      <Description>{recipe.description}</Description>
      <Info>
        <strong>Servings:</strong> {recipe.num_servings}
      </Info>
      <Info>
        <strong>Cook Time:</strong> {recipe.cook_time_minutes} minutes
      </Info>
      <Instructions>
        <h2>Instructions</h2>
        <ol>
          {recipe.instructions &&
            recipe.instructions.map((instruction, index) => (
              <li key={index}>{instruction.display_text}</li>
            ))}
        </ol>
      </Instructions>
      {recipe.sections && <h2>Ingredients</h2>}
      {recipe.sections &&
        recipe.sections.map((section, index) => (
          <IngredientsList key={index}>
            {section.components &&
              section.components.map((component, idx) => (
                <Ingredient key={idx}>{component.raw_text}</Ingredient>
              ))}
          </IngredientsList>
        ))}
      {recipe.nutrition && (
        <Nutrition>
          <h2>Nutrition</h2>
          {Object.entries(recipe.nutrition).map(([key, value], index) => (
            <Nutrient key={index}>
              <strong>{key}:</strong> {value}
            </Nutrient>
          ))}
        </Nutrition>
      )}
      <BackButton onClick={onBack}>Back to List</BackButton>
    </DetailContainer>
  );
};

const DetailContainer = styled.div`
  padding: 20px;
  background-color: #f4f4f9;
  border-radius: 10px;
  margin: 20px;
  color: #333;
  font-family: "Arial", sans-serif;

  @media (max-width: 768px) {
    padding: 15px;
    margin: 10px;
  }
`;

const Header = styled.h1`
  color: #2c3e50;
  font-size: 24px;
  margin-bottom: 10px;

  @media (max-width: 768px) {
    font-size: 20px;
  }
`;

const RecipeImage = styled.img`
  width: 100%;
  max-width: 600px;
  height: auto;
  border-radius: 8px;
  object-fit: cover;
  margin: 0 auto 20px;

  @media (max-width: 768px) {
    max-width: 100%;
  }
`;

const Description = styled.p`
  font-size: 16px;
  line-height: 1.6;
  color: #555;

  @media (max-width: 768px) {
    font-size: 14px;
  }
`;

const Info = styled.div`
  font-size: 16px;
  margin-top: 5px;

  @media (max-width: 768px) {
    font-size: 14px;
  }
`;

const Instructions = styled.section`
  margin-top: 20px;
`;

const IngredientsList = styled.ul`
  padding: 0;
  list-style-type: none;
  margin-top: 10px;
`;

const Ingredient = styled.li`
  margin-bottom: 5px;
`;

const Nutrition = styled.div`
  margin-top: 20px;
`;

const Nutrient = styled.div`
  margin-bottom: 5px;
`;

const BackButton = styled.button`
  padding: 8px 16px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  margin-top: 20px;

  &:hover {
    background-color: #2980b9;
  }

  @media (max-width: 768px) {
    padding: 6px 12px;
    font-size: 14px;
  }
`;

export default RecipeDetail;
