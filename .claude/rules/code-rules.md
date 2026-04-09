When writing code:
- Use TypeScript strict mode — no 'any' type unless explicitly justified
- All async operations must have error handling (try/catch or error boundaries)
- Never hardcode API keys, secrets, or connection strings — use environment variables
- Use named exports over default exports for better refactoring support
- Keep components under 200 lines — extract sub-components if longer
- Keep utility functions pure when possible (no side effects)
- Use Zod or similar for runtime validation of external data (API responses, form inputs)
- Never suppress TypeScript or ESLint errors without a comment explaining why
