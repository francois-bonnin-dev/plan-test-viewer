// Configuration plate ESLint 9. Le garde-fou qui compte pour ce projet est
// no-explicit-any + consistent-type-assertions ("never" interdit toute forme
// de `as X`, y compris `as const`) : c'est ce qui transforme la contrainte
// "zéro any / zéro as" en règle vérifiée par la machine plutôt qu'à la relecture.
import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.ts', 'client/src/**/*.ts', 'client/src/**/*.tsx', 'scripts/**/*.mjs'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'never' },
      ],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // TypeScript vérifie déjà les identifiants non déclarés (via @types/node,
      // lib.dom.d.ts, etc.) et le fait mieux que `no-undef`, qui ne connaît pas
      // ces globales ambiantes et ne produit que des faux positifs ici —
      // recommandation standard de typescript-eslint.
      'no-undef': 'off',
    },
  },
  {
    ignores: ['dist/**', 'public/build/**', 'node_modules/**'],
  },
];
