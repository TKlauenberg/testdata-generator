import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  // Ignore patterns
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '*.min.js',
      '.eslintrc.js',
      'eslint.config.js',
      '*.config.js',
      '*.config.ts',
    ],
  },
  // Base JavaScript recommended rules
  js.configs.recommended,
  // TypeScript recommended rules with type checking
  ...tseslint.configs.recommendedTypeChecked,
  // TypeScript language options
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // Custom TypeScript rules
  {
    files: ['**/*.ts'],
    rules: {
      // TypeScript-specific rules
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      // Enforce private member naming convention with underscore
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: ['property', 'method'],
          modifiers: ['private'],
          format: ['camelCase'],
          leadingUnderscore: 'require',
          trailingUnderscore: 'forbid',
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          // Allow __dirname, __filename and other dunder variables
          leadingUnderscore: 'allow',
          filter: {
            regex: '^__',
            match: false,
          },
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
      ],
      // Additional strict rules
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
    },
  },
  // JavaScript/General rules
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
    },
  },
  // Disable ESLint rules that conflict with Prettier
  eslintConfigPrettier,
);
