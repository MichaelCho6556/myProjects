import React from "react";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

function SkeletonCard() {
  return (
    <SkeletonTheme baseColor="var(--bg-overlay)" highlightColor="var(--bg-light)">
      <div className="item-card">
        <Skeleton height={300} width="100%" style={{ aspectRatio: "3/4" }} />
        <div className="item-card-content-wrapper">
          <h3>
            <Skeleton height={24} width="80%" />
          </h3>
          <div className="details">
            <p>
              <Skeleton height={16} width="60%" style={{ marginBottom: "8px" }} />
            </p>
            <p>
              <Skeleton height={16} width="40%" style={{ marginBottom: "8px" }} />
            </p>
          </div>
          <div className="genres-themes-wrapper">
            <p className="genres">
              <Skeleton height={16} width="90%" style={{ marginBottom: "6px" }} />
            </p>
            <p className="themes">
              <Skeleton height={16} width="70%" style={{ marginBottom: "6px" }} />
            </p>
          </div>
        </div>
      </div>
    </SkeletonTheme>
  );
}

export default React.memo(SkeletonCard);
