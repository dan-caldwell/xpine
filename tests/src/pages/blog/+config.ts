export default {
  // Known blog post slugs (could come from a CMS/database). Each becomes an
  // explicit, statically generated route under /blog.
  staticPaths() {
    return [
      { slug: 'technology/devops/my-blog-post' },
    ];
  },
  // Runtime validator for slugs that were not known at build time. Only slugs
  // under "preview/" are allowed; anything else falls through to the 404 page.
  isValid(slug: string) {
    return slug.startsWith('preview/');
  },
};
