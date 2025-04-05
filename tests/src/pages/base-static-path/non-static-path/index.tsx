import { PageProps } from 'xpine/dist/types';

export const config = {
  staticPaths: false
}

export default function Component({ data }: PageProps) {
  return (
    <>
      <div data-testid="non-static-path">{data.title}</div>
    </>
  );
}