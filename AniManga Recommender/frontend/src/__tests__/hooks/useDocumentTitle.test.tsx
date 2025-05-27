/**
 * Unit Tests for useDocumentTitle Hook
 * Tests document title updates and cleanup
 */

import { renderHook } from "@testing-library/react";
import useDocumentTitle from "../../hooks/useDocumentTitle";

describe("useDocumentTitle Hook", () => {
  const originalTitle = document.title;

  afterEach(() => {
    document.title = originalTitle;
  });

  it("sets document title when title is provided", () => {
    renderHook(() => useDocumentTitle("Test Page"));

    expect(document.title).toBe("Test Page | AniManga Recommender");
  });

  it("handles empty title gracefully", () => {
    renderHook(() => useDocumentTitle(""));

    expect(document.title).toBe("AniManga Recommender");
  });

  it("handles null title", () => {
    renderHook(() => useDocumentTitle(null as any));

    expect(document.title).toBe("AniManga Recommender");
  });

  it("handles undefined title", () => {
    renderHook(() => useDocumentTitle(undefined as any));

    expect(document.title).toBe("AniManga Recommender");
  });

  it("updates title when title changes", () => {
    const { rerender } = renderHook(({ title }) => useDocumentTitle(title), {
      initialProps: { title: "Initial Title" },
    });

    expect(document.title).toBe("Initial Title | AniManga Recommender");

    rerender({ title: "Updated Title" });

    expect(document.title).toBe("Updated Title | AniManga Recommender");
  });

  it("restores original title on unmount", () => {
    const { unmount } = renderHook(() => useDocumentTitle("Test Page"));

    expect(document.title).toBe("Test Page | AniManga Recommender");

    unmount();

    expect(document.title).toBe(originalTitle);
  });

  it("handles special characters in title", () => {
    renderHook(() => useDocumentTitle("Test & Special <Characters>"));

    expect(document.title).toBe("Test & Special <Characters> | AniManga Recommender");
  });

  it("handles very long titles", () => {
    const longTitle = "A".repeat(200);
    renderHook(() => useDocumentTitle(longTitle));

    expect(document.title).toBe(`${longTitle} | AniManga Recommender`);
  });
});
