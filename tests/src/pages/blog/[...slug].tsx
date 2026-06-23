import { PageProps } from 'xpine/dist/types';

export default function BlogPost({ req }: PageProps) {
  return (
    <div>
      <div data-testid="blog-post">Blog post</div>
      <div data-testid="blog-slug">{req.params.slug}</div>
    </div>
  );
}
