import path from 'path';
import { fileURLToPath } from 'url';
const filename = fileURLToPath(import.meta.url);
const basePath = path.dirname(filename);
export default basePath;