import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import nextPlugin from '@next/eslint-plugin-next';

const nextCoreWebVitals = nextPlugin.configs['core-web-vitals'];

export default [
  {
    ignores: ['.next/**', 'node_modules/**', 'dist/**', 'public/**', 'srcybase/**'],
  },
  nextCoreWebVitals,
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      ...nextCoreWebVitals.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'no-unused-vars': 'off',
      'prefer-const': 'off',
      'no-useless-escape': 'off',
      '@next/next/no-page-custom-font': 'off',
    },
  },
];
