/**
 * Unit Tests for HomePage Helper Functions
 * Tests toSelectOptions and getMultiSelectValuesFromParam functions
 */

import { SelectOption } from "../../types";

// Extract helper functions for testing
// These are copied from HomePage.tsx for isolated testing
const toSelectOptions = (optionsArray: string[], includeAll: boolean = false): SelectOption[] => {
  const mapped = optionsArray
    .filter((opt) => typeof opt === "string" && opt.toLowerCase() !== "all")
    .map((opt) => ({ value: opt, label: opt }));
  return includeAll ? [{ value: "All", label: "All" }, ...mapped] : mapped;
};

const getMultiSelectValuesFromParam = (
  paramValue: string | null,
  optionsSource: SelectOption[]
): SelectOption[] => {
  if (!paramValue) return [];
  const selectedValues = paramValue.split(",").map((v) => v.trim().toLowerCase());
  return optionsSource.filter((opt) => selectedValues.includes(opt.value.toLowerCase()));
};

describe("HomePage Helper Functions", () => {
  describe("toSelectOptions", () => {
    describe("Basic Functionality", () => {
      it("converts string array to SelectOption array", () => {
        const input = ["Action", "Adventure", "Comedy"];
        const result = toSelectOptions(input);

        expect(result).toEqual([
          { value: "Action", label: "Action" },
          { value: "Adventure", label: "Adventure" },
          { value: "Comedy", label: "Comedy" },
        ]);
      });

      it("returns empty array for empty input", () => {
        const result = toSelectOptions([]);

        expect(result).toEqual([]);
      });

      it("handles single item array", () => {
        const input = ["Action"];
        const result = toSelectOptions(input);

        expect(result).toEqual([{ value: "Action", label: "Action" }]);
      });
    });

    describe("includeAll Parameter", () => {
      it('includes "All" option when includeAll is true', () => {
        const input = ["Action", "Adventure"];
        const result = toSelectOptions(input, true);

        expect(result).toEqual([
          { value: "All", label: "All" },
          { value: "Action", label: "Action" },
          { value: "Adventure", label: "Adventure" },
        ]);
      });

      it('does not include "All" option when includeAll is false', () => {
        const input = ["Action", "Adventure"];
        const result = toSelectOptions(input, false);

        expect(result).toEqual([
          { value: "Action", label: "Action" },
          { value: "Adventure", label: "Adventure" },
        ]);
      });

      it('does not include "All" option when includeAll is not provided (default)', () => {
        const input = ["Action", "Adventure"];
        const result = toSelectOptions(input);

        expect(result).toEqual([
          { value: "Action", label: "Action" },
          { value: "Adventure", label: "Adventure" },
        ]);
      });

      it('includes "All" option for empty array when includeAll is true', () => {
        const result = toSelectOptions([], true);

        expect(result).toEqual([{ value: "All", label: "All" }]);
      });
    });

    describe("Filtering Logic", () => {
      it('filters out existing "all" values (case insensitive)', () => {
        const input = ["all", "Action", "ALL", "Adventure", "All"];
        const result = toSelectOptions(input);

        expect(result).toEqual([
          { value: "Action", label: "Action" },
          { value: "Adventure", label: "Adventure" },
        ]);
      });

      it('filters out existing "all" values even when includeAll is true', () => {
        const input = ["all", "Action", "ALL", "Adventure"];
        const result = toSelectOptions(input, true);

        expect(result).toEqual([
          { value: "All", label: "All" },
          { value: "Action", label: "Action" },
          { value: "Adventure", label: "Adventure" },
        ]);
      });

      it("filters out non-string values", () => {
        const input = ["Action", null, undefined, 123, "Adventure", ""] as any[];
        const result = toSelectOptions(input);

        expect(result).toEqual([
          { value: "Action", label: "Action" },
          { value: "Adventure", label: "Adventure" },
          { value: "", label: "" }, // Empty string is still a string
        ]);
      });
    });

    describe("Edge Cases", () => {
      it('handles array with only "all" values', () => {
        const input = ["all", "ALL", "All"];
        const result = toSelectOptions(input);

        expect(result).toEqual([]);
      });

      it('handles array with only "all" values when includeAll is true', () => {
        const input = ["all", "ALL", "All"];
        const result = toSelectOptions(input, true);

        expect(result).toEqual([{ value: "All", label: "All" }]);
      });

      it("handles special characters in option values", () => {
        const input = ["Action & Adventure", "Sci-Fi", "Comedy/Romance"];
        const result = toSelectOptions(input);

        expect(result).toEqual([
          { value: "Action & Adventure", label: "Action & Adventure" },
          { value: "Sci-Fi", label: "Sci-Fi" },
          { value: "Comedy/Romance", label: "Comedy/Romance" },
        ]);
      });

      it("handles unicode characters", () => {
        const input = ["アクション", "コメディ", "ドラマ"];
        const result = toSelectOptions(input);

        expect(result).toEqual([
          { value: "アクション", label: "アクション" },
          { value: "コメディ", label: "コメディ" },
          { value: "ドラマ", label: "ドラマ" },
        ]);
      });

      it("handles very long option names", () => {
        const longName = "This is a very long genre name that might cause issues";
        const input = [longName];
        const result = toSelectOptions(input);

        expect(result).toEqual([{ value: longName, label: longName }]);
      });

      it("preserves exact casing of input values", () => {
        const input = ["ACTION", "adventure", "CoMeDy"];
        const result = toSelectOptions(input);

        expect(result).toEqual([
          { value: "ACTION", label: "ACTION" },
          { value: "adventure", label: "adventure" },
          { value: "CoMeDy", label: "CoMeDy" },
        ]);
      });
    });
  });

  describe("getMultiSelectValuesFromParam", () => {
    const mockOptions: SelectOption[] = [
      { value: "Action", label: "Action" },
      { value: "Adventure", label: "Adventure" },
      { value: "Comedy", label: "Comedy" },
      { value: "Drama", label: "Drama" },
      { value: "Romance", label: "Romance" },
    ];

    describe("Basic Functionality", () => {
      it("returns empty array when paramValue is null", () => {
        const result = getMultiSelectValuesFromParam(null, mockOptions);

        expect(result).toEqual([]);
      });

      it("returns empty array when paramValue is empty string", () => {
        const result = getMultiSelectValuesFromParam("", mockOptions);

        expect(result).toEqual([]);
      });

      it("returns matching options for single value", () => {
        const result = getMultiSelectValuesFromParam("action", mockOptions);

        expect(result).toEqual([{ value: "Action", label: "Action" }]);
      });

      it("returns matching options for multiple values", () => {
        const result = getMultiSelectValuesFromParam("action,comedy,drama", mockOptions);

        expect(result).toEqual([
          { value: "Action", label: "Action" },
          { value: "Comedy", label: "Comedy" },
          { value: "Drama", label: "Drama" },
        ]);
      });
    });

    describe("Case Insensitive Matching", () => {
      it("matches regardless of case in parameter", () => {
        const result = getMultiSelectValuesFromParam("ACTION,comedy,DrAmA", mockOptions);

        expect(result).toEqual([
          { value: "Action", label: "Action" },
          { value: "Comedy", label: "Comedy" },
          { value: "Drama", label: "Drama" },
        ]);
      });

      it("matches regardless of case in options", () => {
        const mixedCaseOptions: SelectOption[] = [
          { value: "ACTION", label: "ACTION" },
          { value: "adventure", label: "adventure" },
          { value: "CoMeDy", label: "CoMeDy" },
        ];

        const result = getMultiSelectValuesFromParam("action,ADVENTURE,comedy", mixedCaseOptions);

        expect(result).toEqual([
          { value: "ACTION", label: "ACTION" },
          { value: "adventure", label: "adventure" },
          { value: "CoMeDy", label: "CoMeDy" },
        ]);
      });
    });

    describe("Whitespace Handling", () => {
      it("trims whitespace from parameter values", () => {
        const result = getMultiSelectValuesFromParam(" action , comedy , drama ", mockOptions);

        expect(result).toEqual([
          { value: "Action", label: "Action" },
          { value: "Comedy", label: "Comedy" },
          { value: "Drama", label: "Drama" },
        ]);
      });

      it("handles multiple spaces around commas", () => {
        const result = getMultiSelectValuesFromParam("action  ,   comedy   ,   drama", mockOptions);

        expect(result).toEqual([
          { value: "Action", label: "Action" },
          { value: "Comedy", label: "Comedy" },
          { value: "Drama", label: "Drama" },
        ]);
      });

      it("handles tabs and other whitespace characters", () => {
        const result = getMultiSelectValuesFromParam("\taction\t,\ncomedy\n,\rdrama\r", mockOptions);

        expect(result).toEqual([
          { value: "Action", label: "Action" },
          { value: "Comedy", label: "Comedy" },
          { value: "Drama", label: "Drama" },
        ]);
      });
    });

    describe("Non-matching Values", () => {
      it("ignores non-matching values", () => {
        const result = getMultiSelectValuesFromParam("action,nonexistent,comedy", mockOptions);

        expect(result).toEqual([
          { value: "Action", label: "Action" },
          { value: "Comedy", label: "Comedy" },
        ]);
      });

      it("returns empty array when no values match", () => {
        const result = getMultiSelectValuesFromParam("nonexistent1,nonexistent2", mockOptions);

        expect(result).toEqual([]);
      });

      it("handles empty values in comma-separated string", () => {
        const result = getMultiSelectValuesFromParam("action,,comedy,", mockOptions);

        expect(result).toEqual([
          { value: "Action", label: "Action" },
          { value: "Comedy", label: "Comedy" },
        ]);
      });
    });

    describe("Edge Cases", () => {
      it("handles single comma", () => {
        const result = getMultiSelectValuesFromParam(",", mockOptions);

        expect(result).toEqual([]);
      });

      it("handles multiple commas", () => {
        const result = getMultiSelectValuesFromParam(",,,", mockOptions);

        expect(result).toEqual([]);
      });

      it("handles parameter with only spaces", () => {
        const result = getMultiSelectValuesFromParam("   ", mockOptions);

        expect(result).toEqual([]);
      });

      it("handles empty options array", () => {
        const result = getMultiSelectValuesFromParam("action,comedy", []);

        expect(result).toEqual([]);
      });

      it("handles special characters in parameter values", () => {
        const specialOptions: SelectOption[] = [
          { value: "Action & Adventure", label: "Action & Adventure" },
          { value: "Sci-Fi", label: "Sci-Fi" },
          { value: "Comedy/Romance", label: "Comedy/Romance" },
        ];

        const result = getMultiSelectValuesFromParam("action & adventure,sci-fi", specialOptions);

        expect(result).toEqual([
          { value: "Action & Adventure", label: "Action & Adventure" },
          { value: "Sci-Fi", label: "Sci-Fi" },
        ]);
      });

      it("preserves order of matching options from optionsSource", () => {
        const result = getMultiSelectValuesFromParam("drama,action,comedy", mockOptions);

        // Should return in the order they appear in mockOptions, not parameter order
        expect(result).toEqual([
          { value: "Action", label: "Action" },
          { value: "Comedy", label: "Comedy" },
          { value: "Drama", label: "Drama" },
        ]);
      });

      it("handles duplicate values in parameter", () => {
        const result = getMultiSelectValuesFromParam("action,action,comedy,action", mockOptions);

        // Should not return duplicates
        expect(result).toEqual([
          { value: "Action", label: "Action" },
          { value: "Comedy", label: "Comedy" },
        ]);
      });
    });

    describe("Type Safety", () => {
      it("works with properly typed SelectOption arrays", () => {
        const typedOptions: SelectOption[] = [
          { value: "Test1", label: "Test Label 1" },
          { value: "Test2", label: "Test Label 2" },
        ];

        const result = getMultiSelectValuesFromParam("test1", typedOptions);

        expect(result).toEqual([{ value: "Test1", label: "Test Label 1" }]);
      });
    });
  });
});
