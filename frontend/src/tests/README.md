# tests/

No automated tests exist in this project yet. This directory was created as
part of the production architecture layout (per the target `src/` structure)
but intentionally left empty rather than filled with placeholder or
low-value smoke tests — fabricating tests just to populate the folder would
give false confidence without actually verifying behavior.

Recommended first tests to add (highest value first):
1. `engine/progressionEngine.test.js` — `clampPercent` and
   `estimateStatGainForDisplay` are pure functions with no dependencies;
   trivial to unit test and currently have zero coverage.
2. `engine/eventEngine.test.js` — `deriveEventTypes` is pure and easy to
   test against representative raw event shapes.
3. An integration test for the quest-complete → cinematic → refresh flow,
   once a test runner with React Testing Library + a mocked `services/api`
   is set up (react-scripts/craco already ships Jest, so `npm test` works
   today — it just has nothing to run).
