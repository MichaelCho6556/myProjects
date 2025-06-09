import React from "react";
import "./Spinner.css";
import { SpinnerProps } from "../types";

/**
 * Spinner Component - Loading indicator with TypeScript support
 *
 * @param props - Component props with type safety
 * @returns JSX.Element
 */
const Spinner: React.FC<SpinnerProps> = ({
  size = "50px",
  color = "var(--accent-primary)",
  className = "",
  "data-testid": dataTestId,
}) => {
  // Ensure size is converted to string if it's a number
  const sizeValue = typeof size === "number" ? `${size}px` : size;

  return (
    <div
      className={`loading-spinner ${className}`}
      style={{
        width: sizeValue,
        height: sizeValue,
        borderTopColor: color,
        borderRightColor: color,
        borderBottomColor: color,
        borderLeftColor: "transparent", // Makes one side transparent for the spin effect
      }}
      role="status"
      aria-label="Loading"
      data-testid={dataTestId}
    />
  );
};

export default Spinner;
