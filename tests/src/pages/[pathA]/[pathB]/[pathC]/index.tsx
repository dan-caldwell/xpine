import { PageProps } from 'xpine/dist/types';

export default function Component({ data }: PageProps) {
  return (
    <>
      <div data-testid="path-c-data">{data.title}</div>
      <div data-testid="path-c-patha">{data.pathA}</div>
      <div data-testid="path-c-pathb">{data.pathB}</div>
    </>
  );
}