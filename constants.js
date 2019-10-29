module.exports = {
  defaultMimeTypes: ['javascript'],

  defaultMimeTypePatterns: {
    javascript: ['javascript'],
    css: ['css'],
  },

  ignoreAssetPattern: /(^data:)/,

  arrayParams: [
    'labels',
    'internalPatterns',
    'mimeTypes',
    'mimeTypePatterns',
    'ignorePatterns',
    'cookies',
  ],
};
