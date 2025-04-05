import { PageProps } from 'xpine/dist/types';

export const config = {
  staticPaths: true,
  data() {
    return {
      title: 'My title'
    }
  }
}

export default function Component({ data }: PageProps) {
  return (
    <>
      <div data-testid="boolean-static-path">{data.title}</div>
    </>
  );
}