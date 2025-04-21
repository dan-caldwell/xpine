import { context } from "xpine";
import Button from "../components/Button";
import { PageProps } from "../../../dist/types";

export function xpineOnLoad() {
  context.addToArray('navbar', 'page-sending-context', 2);
  context.addToArray('navbar', 'page-sending-context-date-1', new Date('January 11, 2024'));
  context.addToArray('navbar', 'page-sending-context-date-2', new Date('January 10, 2024'));
  context.addToArray('navbar', 'page-sending-context-date-3', new Date('January 30, 2024'));
}

export default async function Component({ path }: PageProps) {
  return (
    <div>
      <div>Page sending context</div>
      <Button />
      <h2 data-testid="path-from-page" data-path={path}>Path from page: {path}</h2>
    </div>
  )
}
