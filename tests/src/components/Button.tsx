import { context, addToArray } from 'xpine';

export function xpineOnLoad() {
  context.set('navbar', addToArray('orange', 1), []);
}

export default function Button() {
  return (
    <button>My button</button>
  )
}