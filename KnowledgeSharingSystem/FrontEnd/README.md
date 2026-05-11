# FrontEnd

## Code structure

Frontend is organized by app layer and dashboard feature.

- `src/app`: main React app/controller wiring.
- `src/features/auth`: guest, login, register, OTP, forgot-password UI.
- `src/features/dashboard`: dashboard shell, sidebar, topbar, preview panel.
- `src/features/home`: home tab.
- `src/features/library`: document library/search result listing.
- `src/features/search`: search tab.
- `src/features/upload`: document upload tab.
- `src/features/my-documents`: user's uploaded documents.
- `src/features/categories`: course/category management.
- `src/features/moderation`: moderation queue and review screens.
- `src/features/notifications`: notification list and actions.
- `src/features/points`: points dashboard and point policy tab.
- `src/features/profile`: profile and avatar update.
- `src/features/qa`: Q&A session UI.
- `src/features/settings`: account/settings UI.
- `src/features/users`: admin user management.

Each feature keeps MVC-style files together:

- `*.model.js`: maps props/data into view state.
- `*.controller.js`: event handlers for the view.
- `*View.jsx` or `*Tab.jsx`: React view/component layer.

Shared files remain in:

- `src/services`: API feature services.
- `src/models`: app-wide models/helpers.
- `src/utils`: UI utility helpers.
- `src/api.js`, `src/i18n.js`, `src/styles.css`: global API, translation, and styling.

The old `src/components`, `src/views`, and `src/controllers` paths are compatibility wrappers. Open `src/features/<feature>` for the real code of each function.

## Run

1. `npm install`
2. `npm run dev`

Default API base: `http://localhost:3000/api`.

If needed, create `.env` and adjust:

`VITE_API_BASE_URL=...`

## Build check

- `npm run build`
