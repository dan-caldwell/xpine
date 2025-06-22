export function getXPineDistDir() {
  const dir = import.meta.dirname;
  const splitDir = dir.split('/xpine/dist');
  if (splitDir.length === 1) {
    // Try with just /xpine
    const splitDirSingle = dir.split('/xpine/');
    return splitDirSingle[0] + '/xpine/dist';
  }
  return splitDir[0] + '/xpine/dist';
}
