import { context } from 'xpine';

export function xpineOnLoad() {
  context.addToArray('navbar', 'orange');
}

export default function Button() {
  return (
    <button>My button</button>
  )
}