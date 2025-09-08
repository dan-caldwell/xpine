export default {
  bundles: [
    {
      id: 'site',
      excludePaths: [
        // Excludes SecretPageData
        '/**/pages/secret/**/*.{js,ts,tsx,jsx}',
        '/**/pages/secret/*.{js,ts,tsx,jsx}',
      ],
    },
    {
      id: 'secret-page',
      includePaths: [
        // Excludes PathDData
        '/**/pages/secret/**/*.{js,ts,tsx,jsx}',
      ]
    }
  ],
  sitemap: {
    excludePaths: [],
  }
}