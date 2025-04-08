import Button from "../components/Button";
import { NavbarContext } from "../context";

NavbarContext.context.data = [...NavbarContext.context.data, 'red'];

export default async function Component() {
  return (
    <div>
      <div>Page sending context</div>
      <Button />
    </div>
  )
}
