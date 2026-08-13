export async function readJsonFile(file: File): Promise<unknown> {
  return JSON.parse(await file.text());
}

export function sanitizeFileNameSegment(value: string): string {
  return value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '');
}

export function downloadJsonFile(
  fileName: string,
  value: unknown,
  indentation?: number,
): void {
  const url = URL.createObjectURL(new Blob(
    [JSON.stringify(value, null, indentation)],
    { type: 'application/json' },
  ));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.hidden = true;
  document.body.appendChild(anchor);

  try {
    anchor.click();
  } finally {
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}
