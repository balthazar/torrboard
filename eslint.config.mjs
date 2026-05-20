import js from '@eslint/js'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import prettierConfig from 'eslint-config-prettier'
import globals from 'globals'

const commonGlobals = {
  __ENV__: 'readonly',
  __DEV__: 'readonly',
  __PROD__: 'readonly',
  __APIURL__: 'readonly',
}

export default [
  js.configs.recommended,
  // Server / scripts: node CJS, no react.
  {
    files: ['src/server/**/*.js', 'scripts/**/*.js', 'src/config.js', 'vite.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...commonGlobals,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  // Client: browser ESM with JSX and react hooks.
  {
    files: ['src/**/*.{js,jsx}'],
    ignores: ['src/server/**', 'src/config.js'],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2022,
        ...commonGlobals,
        MediaMetadata: 'readonly',
        // Vite's `define` rewrites process.env.* in client code at build time,
        // so the identifier appears in source even though there's no node here.
        process: 'readonly',
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/no-array-index-key': 'off',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/display-name': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      camelcase: 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  prettierConfig,
]
