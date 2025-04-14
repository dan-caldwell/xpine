import { PageProps } from 'xpine/dist/types';
import { context } from 'xpine';

export function xpineOnLoad() {
  context.addToArray('navbar', 'boolean static path', 50);
}

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