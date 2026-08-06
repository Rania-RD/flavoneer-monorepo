# Shared UI rules

Import framework-neutral presentation rules from explicit package entry points.

- `@flavoneer/ui/avatar` returns user initials and a deterministic Flavoneer
  color pair. Pass the normalized account email as the seed so the same person
  keeps the same background on web and mobile.

React and React Native components stay inside their applications because their
rendering primitives differ.
