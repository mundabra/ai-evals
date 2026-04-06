import type { Citation, SourceEntry } from './types.js';

const urlCandidateKeys = [
  'url',
  'uri',
  'href',
  'link',
  'sourceUrl',
  'sourceURL',
  'source_url',
] as const;

const maxTraversalDepth = 4;
const maxArrayItems = 20;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isDocumentLike(value: unknown): value is {
  id: string;
  title: string;
  source: string;
} {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.source === 'string'
  );
}

function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeUrl(value: string): string {
  const url = new URL(value);
  url.hash = '';

  const trackingParams = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'ref',
  ];

  for (const key of trackingParams) {
    url.searchParams.delete(key);
  }

  const pathname = url.pathname.replace(/\/+$/, '');
  url.pathname = pathname || '/';
  url.hostname = url.hostname.toLowerCase();

  return url.toString();
}

function labelFromUrl(url: URL, title?: string): string {
  const cleanedTitle = title?.trim();
  if (cleanedTitle) {
    return cleanedTitle;
  }

  const path = url.pathname.replace(/\/+$/, '');
  return path && path !== '/' ? `${url.hostname}${path}` : url.hostname;
}

function buildDocumentEntry(
  document: { id: string; title: string; source: string },
  kind: SourceEntry['kind'],
  originTool?: string,
): SourceEntry {
  return {
    id: document.id,
    kind,
    label: `${document.source}: ${document.title}`,
    source: document.source,
    title: document.title,
    originTool,
  };
}

function buildUrlEntry(rawUrl: string, title?: string, originTool?: string): SourceEntry {
  const normalized = normalizeUrl(rawUrl);
  const parsed = new URL(normalized);

  return {
    id: `url:${normalized}`,
    kind: 'url',
    label: labelFromUrl(parsed, title),
    source: parsed.hostname,
    title: title?.trim() || undefined,
    url: normalized,
    originTool,
  };
}

export class SourceRegistry {
  private readonly entries = new Map<string, SourceEntry>();

  add(entry: SourceEntry): void {
    if (!this.entries.has(entry.id)) {
      this.entries.set(entry.id, entry);
    }
  }

  addPromptDocuments(documents: Array<{ id: string; title: string; source: string }>): void {
    for (const document of documents) {
      this.add(buildDocumentEntry(document, 'prompt_document'));
    }
  }

  addToolDocuments(
    documents: Array<{ id: string; title: string; source: string }>,
    originTool: string,
  ): void {
    for (const document of documents) {
      this.add(buildDocumentEntry(document, 'tool_document', originTool));
    }
  }

  addUrl(url: string, title?: string, originTool?: string): void {
    if (!isAbsoluteHttpUrl(url)) {
      return;
    }

    this.add(buildUrlEntry(url, title, originTool));
  }

  captureToolResult(toolName: string, output: unknown): void {
    const visited = new WeakSet<object>();
    this.captureValue(toolName, output, 0, visited);
  }

  hasCitation(citation: Citation): boolean {
    if (this.entries.has(citation.id)) {
      return true;
    }

    let fallbackMatchCount = 0;
    for (const entry of this.entries.values()) {
      if (entry.label === citation.label && entry.source === citation.source) {
        fallbackMatchCount += 1;
      }
    }

    return fallbackMatchCount === 1;
  }

  listEntries(): SourceEntry[] {
    return [...this.entries.values()];
  }

  toCitations(): Citation[] {
    return this.listEntries().map((entry) => ({
      id: entry.id,
      label: entry.label,
      source: entry.source,
    }));
  }

  private captureValue(
    toolName: string,
    value: unknown,
    depth: number,
    visited: WeakSet<object>,
  ): void {
    if (depth > maxTraversalDepth || value == null) {
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value.slice(0, maxArrayItems)) {
        this.captureValue(toolName, item, depth + 1, visited);
      }
      return;
    }

    if (typeof value === 'string') {
      if (isAbsoluteHttpUrl(value)) {
        this.addUrl(value, undefined, toolName);
      }
      return;
    }

    if (!isRecord(value)) {
      return;
    }

    if (visited.has(value)) {
      return;
    }
    visited.add(value);

    const record = value as Record<string, unknown>;

    const title =
      typeof record.title === 'string'
        ? record.title
        : typeof record.name === 'string'
          ? record.name
          : undefined;

    if (isDocumentLike(value)) {
      this.addToolDocuments([value], toolName);
    }

    for (const key of urlCandidateKeys) {
      const candidate = record[key];
      if (typeof candidate === 'string' && isAbsoluteHttpUrl(candidate)) {
        this.addUrl(candidate, title, toolName);
      }
    }

    for (const nested of Object.values(record)) {
      this.captureValue(toolName, nested, depth + 1, visited);
    }
  }
}
