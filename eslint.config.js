import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

/**
 * ESLint flat config for memareh-redesign.
 *
 * Minimal-but-useful baseline:
 * - Recommended JS + TypeScript rules (catches real bugs, unused vars, etc.)
 * - Next.js runtime globals (window, document, process, etc.) so browser/server
 *   code isn't flagged as undefined.
 * - Build output, deps, and generated types are ignored.
 */
export default tseslint.config(
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'coverage/**',
      '.article-optimizer-dist/**',
      'scripts/**',
      'src/types/database.types.ts',
      'src/types/database.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      // Honour the many `eslint-disable-next-line react-hooks/exhaustive-deps`
      // comments already in the codebase; keep it as a warning, not an error.
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'error',
    },
  },
  {
    languageOptions: {
      globals: {
        // Browser
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        // Node / Next
        process: 'readonly',
        console: 'readonly',
        module: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        // React / Next globals
        React: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-useless-escape': 'off',
      'no-undef': 'off',
    },
  },
)
