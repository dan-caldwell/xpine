import emojiUnicode from 'emoji-unicode';

export function convertEmojiToUnicode(emoji: string) {
  return emojiUnicode(emoji)?.replace(/ /g, '-')?.toUpperCase();
}