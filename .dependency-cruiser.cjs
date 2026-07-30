/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies are not allowed in the source graph.',
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: 'not-to-unresolvable',
      severity: 'error',
      comment: 'Local imports must be resolvable.',
      from: {},
      to: {
        couldNotResolve: true,
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    exclude: {
      path: '(^|/)(__tests__|coverage|dist)(/|$)|\\.spec\\.ts$|\\.test\\.ts$',
    },
    tsPreCompilationDeps: false,
    moduleSystems: ['es6', 'cjs'],
    reporterOptions: {
      text: {
        highlightFocused: true,
      },
    },
  },
};
