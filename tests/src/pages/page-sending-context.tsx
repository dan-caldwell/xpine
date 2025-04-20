import { context } from "xpine";
import Button from "../components/Button";

export function xpineOnLoad() {
  context.addToArray('navbar', 'page-sending-context', 2);
  context.addToArray('navbar', 'page-sending-context-date-1', new Date('January 11, 2024'));
  context.addToArray('navbar', 'page-sending-context-date-2', new Date('January 10, 2024'));
  context.addToArray('navbar', 'page-sending-context-date-3', new Date('January 30, 2024'));
}

export default async function Component() {
  return (
    <div>
      <div>Page sending context</div>
      <Button />
    </div>
  )
}
