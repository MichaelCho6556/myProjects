import React from "react";
import { render } from "@testing-library/react";
import App from "./App";

describe("App Component", () => {
  it("renders the AniManga Recommender app without crashing", () => {
    render(<App />);

    // Check that the app container exists
    const appContainer = document.querySelector(".App");
    expect(appContainer).toBeInTheDocument();
  });
});
