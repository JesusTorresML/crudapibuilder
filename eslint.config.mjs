import jsdoc from 'eslint-plugin-jsdoc';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';

export default tseslint.config({
  files: ['src/**/*.ts'],
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      project: './tsconfig.json',
      
    },
  },
  plugins: {
    '@typescript-eslint': tseslint.plugin,
    jsdoc,
    prettier, 
  },
  settings: {
    jsdoc: {
      mode: 'typescript',
    },
  },
  rules: {
    // Prettier
    'prettier/prettier': 'error', 
    '@typescript-eslint/explicit-function-return-type': [
      'error',
      {
        allowExpressions: true // allow direct expressions
      }
    ],

    // TypeScript
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/consistent-type-exports': 'error',
    '@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'explicit' }],
    '@typescript-eslint/member-ordering': 'warn',

    // JSDoc
    'jsdoc/require-jsdoc': ['warn', {
      publicOnly: false,
      require: {
        FunctionDeclaration: true,
        MethodDefinition: true,
        ClassDeclaration: true,
        ArrowFunctionExpression: true,
        FunctionExpression: true,
      },
    }],
    'jsdoc/require-param': 'warn',
    'jsdoc/require-param-type': 'warn',
    'jsdoc/require-param-description': 'warn',
    'jsdoc/require-returns': 'warn',
    'jsdoc/require-returns-type': 'warn',
    'jsdoc/require-returns-description': 'warn',
    'jsdoc/valid-types': 'warn',

    // General
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'camelcase': 'warn',
    'spaced-comment': ['warn', 'always', { markers: ['/'] }],
    eqeqeq: ['error', 'always'],
  },
});
