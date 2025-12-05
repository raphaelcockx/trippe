import globals from 'globals'
import pluginJs from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'

export default [
  { languageOptions: { globals: globals.node } },
  pluginJs.configs.recommended,
  stylistic.configs['recommended'],
  {
    rules: {
      '@stylistic/arrow-parens': ['warn', 'always'],
      '@stylistic/brace-style': ['warn', '1tbs', { allowSingleLine: true }],
      '@stylistic/comma-dangle': ['error', 'never'],
      '@stylistic/eol-last': ['warn', 'always'],
      '@stylistic/keyword-spacing': ['warn', { after: true, before: true }],
      '@stylistic/no-multiple-empty-lines': ['warn', { max: 1 }],
      '@stylistic/no-multi-spaces': 'warn',
      '@stylistic/one-var-declaration-per-line': ['error', 'always'],
      '@stylistic/operator-linebreak': ['warn', 'none', { overrides: { '?': 'before', ':': 'before' } }],
      '@stylistic/quote-props': ['error', 'as-needed'],
      '@stylistic/quotes': ['warn', 'single'],
      '@stylistic/semi': ['warn', 'never'],
      '@stylistic/space-before-blocks': ['warn', 'always'],
      '@stylistic/space-before-function-paren': ['warn', 'always'],
      '@stylistic/no-trailing-spaces': 'warn',
      'no-unused-vars': ['warn', { ignoreRestSiblings: true, caughtErrors: 'none' }]
    }
  }
]