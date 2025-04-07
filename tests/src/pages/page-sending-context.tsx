import context from "../context";

export async function onInit() {
  console.log('page sending context on init');
  context.navbar.set((currentContext) => [...currentContext, 'red']);
}

export default async function Component() {
  return (
    <div>Page sending context</div>
  )
}
