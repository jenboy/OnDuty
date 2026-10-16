import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

/** @type {import('eslint').Linter.Config[]} */
const config = [
  ...nextCoreWebVitals,
  {
    ignores: ['dist/**', '.next/**', 'node_modules/**', 'next-env.d.ts'],
  },
];

export default config;
