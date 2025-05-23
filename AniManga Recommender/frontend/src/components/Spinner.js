import React from "react";
import "./Spinner.css"; // We'll create this CSS file next

const Spinner = ({ size = "50px", color = "var(--accent-primary)" }) => {
  return (
    <div
      className="loading-spinner"
      style={{
        width: size,
        height: size,
        borderTopColor: color,
        borderRightColor: color,
        borderBottomColor: color,
        borderLeftColor: "transparent", // Makes one side transparent for the spin effect
      }}
    ></div>
  );
};

export default Spinner;
