// ESLint flat config for the whole repo (CI stage 3 "lint").
//   - src/**            React 19 SPA (browser, ESM, JSX)
//   - backend/**        Express API (Node, CommonJS)
//   - backend/tests/**  Jest unit tests
//   - loadtest/**       k6 scripts (ESM, k6 runtime globals)
//   - root *.config.js  Node tooling (Vite, ESLint)
// eslint-config-prettier is applied last so stylistic rules never fight
// Prettier (formatting is checked separately by `npm run format:check`).
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier/flat';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores([
    '**/dist/',
    '**/coverage/',
    '**/node_modules/',
    'design/',
    'infra/**/.terraform/',
  ]),

  // ---- frontend (browser) --------------------------------------------------
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },

  // ---- root tooling config (Node, ESM) -------------------------------------
  {
    files: ['*.config.{js,mjs}'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
  },

  // ---- backend (Node, CommonJS) --------------------------------------------
  {
    files: ['backend/**/*.{js,cjs}'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['backend/**/*.mjs'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
  },
  {
    files: ['backend/tests/**/*.{js,cjs,mjs}', 'backend/**/*.test.{js,cjs,mjs}'],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
  },

  // ---- k6 load tests -------------------------------------------------------
  {
    files: ['loadtest/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        __ENV: 'readonly',
        __VU: 'readonly',
        __ITER: 'readonly',
        open: 'readonly',
        console: 'readonly',
      },
    },
  },

  prettier,
]);
