# Login Page Motion and Form Alignment

## Goal

Make the login page entrance feel slower and more polished while keeping the existing visual language and login behavior. Ensure the username and password controls share one responsive label column so their input areas have the same width and align consistently.

## Scope

- Update only the login page styles unless the component API needs a minimal label-column configuration.
- Preserve the existing two-column desktop layout and stacked mobile layout.
- Preserve the existing reduced-motion behavior.
- Do not change authentication requests, validation, routing, or copy.

## Design

The form will use one responsive label column for both fields. The label column will be sized relative to the form text rather than to the viewport, and the input wrapper will consume the remaining available width. This keeps both input controls equal and aligned while allowing the entire form to resize at responsive breakpoints.

The brand content and form content will use a longer fade-up entrance duration of approximately 0.8 seconds, with a slightly increased stagger for the form. The decorative rings will rotate more slowly, approximately 30 seconds per cycle. The motion remains subtle and existing `prefers-reduced-motion` rules will continue to disable it.

## Verification

- Add focused assertions for the shared form label-column configuration where the current test setup supports it.
- Run the frontend test suite.
- Run the production build to catch TypeScript and CSS integration issues.
- Inspect the final diff and confirm no login behavior or unrelated files changed.
