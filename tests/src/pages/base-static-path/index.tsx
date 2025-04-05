import { PageProps } from 'xpine/dist/types';

export default function Component({ data }: PageProps) {
  return (
    <>
      <div data-testid="base-static-path">{data.title}</div>
    </>
  );
}