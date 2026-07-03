import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // convention: leading underscore marks intentionally unused
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      // new-in-v7 opinionated rules — kept visible as warnings; refactoring
      // the flagged effects wholesale is riskier than the pattern itself
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
  {
    // providers export hooks/constants alongside components by design
    files: ['**/contexts/**', '**/components/ui/Toast.tsx', '**/components/pdf/PDFHeader.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
