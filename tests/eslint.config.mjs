import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      'eol-last': 2,
      'quotes': ['error', 'single'],
      'comma-dangle': ['error', {
        'objects': 'always',
        'arrays': 'never',
        'imports': 'never',
        'exports': 'never',
        'functions': 'never',
      }],
      'semi': 'error',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
    files: ["src/**/*.{js,mjs,ts,tsx,jsx}", "cdk/**/*.{js,ts,mjs}"],
  },
  {
    ignores: ["dist/", "cdk.out/"]
  }
)
