import { context } from "xpine";
import Button from "../components/Button";

export function xpineOnLoad() {
  context.addToArray('navbar', 'red', 2);
}

export default async function Component() {
  return (
    <div>
      <div>Page sending context</div>
      <Button />
    </div>
  )
}
