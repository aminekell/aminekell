# Amine Kella — portfolio design

A personal portfolio direction, implemented on 21 November 2026. The user requested their name as the visual identity.

## The premise

The part Amine is interested in is often invisible: between a command and a process, a grid and a view, a request and its database. The portfolio follows those intervals as a readable typographic essay.

The visual identity is Amine Kella’s own name: an oversized sans-serif first name balanced against a contrasting italic surname. The page title, social metadata, footer, and AK favicon use that same personal identity. Project navigation is a set of concrete questions. Each project has a different composition based on its subject: a sentence split by a pipe, two interpretations of a map, offset service layers, and a question answered by a system.

The old scientific instrument, projected ribbon, six interchangeable experiment tabs, and project-card layout are replaced. There is no entrance gate, automatic animation loop, sound, custom cursor, drag-only navigation, or scroll interception.

## Personal content and source

The learning path, skills, coursework, and social links come from the profile and existing portfolio record. The current published portfolio was reread during this redesign, including its newer HirePath contribution description and 21-repository archive. Those project links and descriptions are retained in a native expandable index with search.

HirePath is identified as a team project. The contribution text describes company onboarding, profile forms, backend validation, image uploads, and dashboard integrations, as recorded in the current published site and its contribution link. It does not imply ownership of the entire application.

Minishell, cub3D, Inception, and HirePath link to their published sources. The C++ and remaining systems projects stay discoverable in the index.

## Implementation

- Buildless semantic HTML, CSS, and browser modules. No framework, CDN, analytics, or third-party runtime request.
- Two locally hosted fonts; the display serif uses system fonts.
- Essential content, project links, navigation, and the repository archive exist in the HTML without JavaScript.
- A bounded pipeline model returns each stage's actual data; literal pipes inside quotes remain intact. User text is written with `textContent`.
- Grid DDA raycasting renders only on initialization and input. The native range input provides keyboard and touch control.
- The Inception switch shows request availability separately from persistent storage, without touching live infrastructure.
- Native links, forms, details, labels, visible focus, canvas descriptions, and reduced-motion CSS. The browser illustrations have readable text alternatives.
- The old `lab.html` address redirects to the work index.
- The build copies only the new production entry points and fonts. Prior experiments remain in the source repository, outside the published artifact.

## Verification

The existing model test files pass. A regression assertion checks that pipeline stage previews preserve a quoted pipe as literal data. The static build validates module syntax, relative dependencies, local assets, duplicate IDs, and DOM targets.

Browser checks cover the pipeline's successful and rejected inputs, keyboard input and reset for raycasting, database interruption and recovery, and repository filtering. At measured content widths of 305, 753, and 1265 CSS pixels, the document did not overflow horizontally. The mobile project compositions were also inspected visually. No browser console errors or warnings were reported during these checks.

This is scoped browser and source verification, not a claim of a complete cross-browser accessibility audit.

## Publication

The existing public GitHub Pages site and audience are retained. Publication changes only the portfolio entry points, its build metadata and model-stage output, the relevant test, and this document. Unrelated staged experiments and documentation are not included.
