// ESLint configuration for GJS / GNOME Shell extension code
import js from '@eslint/js';
import globals from 'globals';

export default [
    {ignores: ['dist/', 'node_modules/']},
    js.configs.recommended,
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: 'module',
            globals: {
                ...globals.es2021,
                // Globals provided by GJS and GNOME Shell
                global: 'readonly',
                log: 'readonly',
                logError: 'readonly',
                print: 'readonly',
                printerr: 'readonly',
                console: 'readonly',
                imports: 'readonly',
                TextEncoder: 'readonly',
                TextDecoder: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': ['error', {argsIgnorePattern: '^_', varsIgnorePattern: '^_'}],
            'no-undef': 'error',
            'prefer-const': 'error',
            'no-var': 'error',
            eqeqeq: ['error', 'always'],
            'no-case-declarations': 'error',
        },
    },
    {
        files: ['eslint.config.js'],
        languageOptions: {globals: globals.node},
    },
];
