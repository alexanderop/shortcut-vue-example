# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `pnpm dev` (opens on http://localhost:3333)
- **Build for production**: `pnpm build` (uses vite-ssg for static site generation)
- **Preview production build**: `pnpm preview`
- **Linting**: `pnpm lint` (ESLint with @antfu/eslint-config)
- **Type checking**: `pnpm typecheck` (Vue TSC without emit)
- **Unit tests**: `pnpm test` or `pnpm test:unit` (Vitest)
- **E2E tests**: `pnpm test:e2e` (Cypress)
- **Bundle size analysis**: `pnpm sizecheck` (vite-bundle-visualizer)

## Architecture Overview

This is a **Vitesse-based Vue 3 application** using modern tooling and conventions:

### Core Stack

- **Vue 3** with Composition API and `<script setup>` syntax
- **Vite** for build tooling with SSG support via vite-ssg
- **TypeScript** throughout
- **pnpm** as package manager
- **UnoCSS** for styling (atomic CSS engine)

### Key Architectural Patterns

#### File-based Routing

- Routes are auto-generated from `src/pages/` directory structure
- Supports `.vue` and `.md` files as routes
- Route types auto-generated in `src/typed-router.d.ts`
- Layouts system via `src/layouts/` with automatic application

#### Auto-imports System

- Vue APIs, VueUse composables, and Vue Router auto-imported
- Custom composables from `src/composables/` auto-imported
- Store modules from `src/stores/` auto-imported
- Component auto-registration from `src/components/`
- Configuration in `vite.config.ts` AutoImport/Components plugins

#### Module System

- User modules in `src/modules/` auto-installed on app creation
- Each module exports an `install` function receiving app context
- Used for configuring plugins like i18n, Pinia, PWA, etc.

#### State Management

- **Pinia** stores in `src/stores/`
- Stores are auto-imported and available globally

#### Internationalization

- **Vue I18n** with locale files in `locales/` directory
- YAML format for translations
- Runtime-only mode for optimal bundle size

### Project Structure Patterns

- `src/composables/` - Reusable composition functions (auto-imported)
- `src/components/` - Vue components (auto-registered)
- `src/layouts/` - Layout templates for pages
- `src/pages/` - File-based routes (supports nested routing with folders)
- `src/stores/` - Pinia state stores
- `src/modules/` - App plugin modules
- `src/styles/` - Global styles and CSS

### Development Notes

- Uses `~/` alias pointing to `src/` directory
- Markdown files can be used as Vue components and routes
- PWA configuration included with auto-update
- Git hooks configured for pre-commit linting
- ESLint config follows @antfu conventions (single quotes, no semicolons)

## Available MCPs for development

### Context7 MCP (for external documentation):

- Fetch up-to-date docs not available in Hex (Nuxt, VueUse, Vue UnoCSS)
- Get current API references for frontend libraries

### Puppeteer MCP (for browser automation):

- Navigate web pages and interact with elements
- Take screenshots and PDFs of web content
- Fill forms and submit data
- Execute JavaScript in browser contexts
- Automate testing workflows and web scraping tasks
- Installed globally via: `claude mcp add puppeteer -s user -- npx -y @modelcontextprotocol/server-puppeteer`

## Post-Edit Workflow

**CRITICAL**: After making any code edits, ALWAYS run the following commands to ensure code quality:

1. `pnpm lint` - Check and fix linting issues
2. `pnpm typecheck` - Verify TypeScript types are correct
3. If either command reports errors, fix them immediately before considering the task complete
