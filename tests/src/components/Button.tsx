import { context } from 'xpine';
import { convertEmojiToUnicode } from '../utils/emoji';

export function xpineOnLoad() {
  context.addToArray('navbar', 'button');
  context.addToArray('navbar', convertEmojiToUnicode('🏋🏼'));
}

export default function Button() {
  return (
    <button>My button</button>
  )
}