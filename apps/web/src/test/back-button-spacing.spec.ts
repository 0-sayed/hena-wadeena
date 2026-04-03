import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function getTsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const resolvedPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return getTsxFiles(resolvedPath);
    }

    return entry.name.endsWith('.tsx') ? [resolvedPath] : [];
  });
}

describe('page back-button icon spacing', () => {
  it('does not add manual margin utilities to ArrowRight icons in page buttons', () => {
    const pagesDir = path.resolve(import.meta.dirname, '../pages');
    const files = getTsxFiles(pagesDir);
    const arrowMarginPattern = /<ArrowRight className="[^"]*\b(?:ms|me|ml|mr)-\d+/;

    const matches = files.flatMap((file) => {
      const content = readFileSync(file, 'utf8');
      const hasMatch = arrowMarginPattern.test(content);

      return hasMatch ? [path.relative(pagesDir, file)] : [];
    });

    expect(matches).toEqual([]);
  });
});
