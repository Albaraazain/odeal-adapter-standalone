export default {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: '20'
        },
        modules: 'auto'
      }
    ]
  ],
  plugins: []
};