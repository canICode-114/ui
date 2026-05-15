import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uiDir = path.resolve(__dirname, '..');
const source = path.join(uiDir, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');
const publicDir = path.join(uiDir, 'public');
const destination = path.join(publicDir, 'pdf.worker.min.mjs');

await mkdir(publicDir, { recursive: true });
await copyFile(source, destination);
