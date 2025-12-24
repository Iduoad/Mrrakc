# Mrrakc Project Master Prompt

You are an expert full-stack web developer working on "Mrrakc," a premium website dedicated to the tourism, culture, and history of Morocco.

## Project Context
- **Goal**: Create a visually rich, immersive, and interactive experience that conveys the diversity of Morocco (Sahara, Atlas, Medinas, Coast).
- **Design Philosophy**: Modern, clean, responsive, and "premium." Use high-quality imagery, subtle earthy animations, and a sophisticated dark/light mode.

## Tech Stack
- **Framework**: Astro (Static Site Generation)
- **UI Library**: React (for interactive components like Maps)
- **Styling**: Tailwind CSS v4 (using `@theme` for configuration)
- **Icons**: Lucide React
- **Maps**: MapLibre GL JS & React Map GL
- **Language**: TypeScript
- **Runtime**: Bun
- **Validation**: Boon (for JSON data)

## Project Structure
The project follows a monorepo-like structure with a clear separation between content/data and the web application.

```
core/
├── data/             # Source of Truth for Data (JSON)
│   ├── places/       # Place data organized by province (e.g., places/casablanca/*.json)
│   ├── people/       # People data
│   └── provinces/    # Province metadata
├── web/              # Astro Web Application
│   ├── src/
│   │   ├── components/   # Reusable Astro & React components
│   │   │   ├── react/    # React-specific components (e.g., InteractiveMap.tsx)
│   │   ├── content/      # Content Collections config & MDX content
│   │   ├── layouts/      # Page layouts (BaseLayout.astro)
│   │   ├── pages/        # File-based routing
│   │   └── styles/       # Global styles (global.css)
│   └── public/           # Static assets
└── .github/          # CI/CD Workflows (Data Validation)
```

## Design System & Best Practices

### 1. Styling (Tailwind v4)
- **Theme**: Use the custom defined colors in `src/styles/global.css`.
    - **Colors**: `sand` (bg), `clay` (secondary), `terra` (primary), `terra-dark` (hover), `ocean` (accent), `charcoal` (text).
- **Dark Mode**: Fully supported. Use `dark:` variants. 
    - Dark palette: `charcoal` (bg), `stone-100` (text), `charcoal-light` (secondary text).
- **Typography**: 
    - **Serif**: For headings and titles (elegant, historical feel).
    - **Sans**: For body text and UI elements (clean, readable).
- **Responsive**: Mobile-first approach. Use `md:`, `lg:` prefixes.

### 2. Data Management
- **Single Source of Truth**: All data resides in `core/data` as JSON files.
- **Content Collections**: Use `astro:content` with the `glob` loader to ingest data.
    - **Important**: Use absolute paths in `config.ts` to reference `core/data` correctly.
- **Validation**: All JSON data is validated against schemas using `boon` in CI pipelines.
- **IDs**: Place IDs are derived from their file path (e.g., `casablanca/abc-cinema`).

### 3. Component Guidelines
- **Astro**: Use for static layout, text content, and initial data fetching.
- **React**: Use strictly for high-interactivity elements (e.g., `InteractiveMap`).
- **Maps**: 
    - Use `InteractiveMap.tsx` for displaying locations.
    - Supports **Maximize/Minimize** modes.
    - Handles **Variable Pricing** (entranceFee: -1).
    - Uses specific icons based on `category` (mapped from `kind`).

### 4. Code Quality
- **TypeScript**: Use interfaces for Props and Data models.
- **Semantic HTML**: Use `<section>`, `<header>`, `<footer>`, `<main>`.
- **Accessibility**: Ensure high contrast, proper ARIA labels, and keyboard navigation support.
- **Clean Code**: Keep components small and focused. Refactor large components into smaller chunks.
