import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...nextCoreWebVitals,
  {
    rules: {
      // 旧视图层（阶段 3 会被整体重写）里有 3 处 setState-in-effect；
      // 重写完成后把这条恢复为 error，作为新代码的门禁。
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    ignores: ['dist/**', '.next/**', 'node_modules/**', 'next-env.d.ts'],
  },
];
