## Development Principles

- If you do not know or need more information. Ask the user, never make random changes to the code
- Never implement anything "simple" thinking its only for development. Make every change ready for production, and make it thinking like it needs to be ready for production and high quality and efficiency.

## Testing Philosophy

When implementing unit/integration tests. Please write a high quality, general purpose solution. Implement a solution that works correctly for all valid inputs, not just the test cases. Do not hard-code values or create solutions that only work for specific test inputs. Instead, implement the actual logic that solves the problem generally. Avoid Mocks. Focus on real integration testing.

Focus on understanding the problem requirements and implementing the correct algorithm. Tests are there to verify correctness, not to define the solution. Provide a principled implementation that follows best practices and software design principles.

If the task is unreasonable or infeasible, or if any of the tests are incorrect, please tell me. The solution should be robust, maintainable, and extendable.

## Memory Note

- When creating new files. Never auto edit them in. Manually paste them and show the user the file location. Let the user manually input the code onto the file. This is only when there needs to be implemented new files.

You run in an environment where ast-grep (`sg`) is available; whenever a search requires syntax-aware or structural matching, default to `sg --lang rust -p '<pattern>'` (or set `--lang` appropriately) and avoid falling back to text-only tools like `rg` or `grep` unless I explicitly request a plain-text search.
