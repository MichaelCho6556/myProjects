import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders the AniManga Recommender app", () => {
  render(<App />);
  // Look for the navbar or some element that should be present
  const navbar = screen.getByRole("navigation");
  expect(navbar).toBeInTheDocument();
});
