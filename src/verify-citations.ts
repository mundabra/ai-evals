import type { Citation, RemovedCitation } from './types.js';
import type { SourceRegistry } from './source-registry.js';

export interface CitationVerificationResult {
  verifiedCitations: Citation[];
  removedCitations: RemovedCitation[];
}

export function verifyCitations(
  citations: Citation[],
  registry: SourceRegistry,
): CitationVerificationResult {
  const verifiedCitations: Citation[] = [];
  const removedCitations: RemovedCitation[] = [];

  for (const citation of citations) {
    if (registry.hasCitation(citation)) {
      verifiedCitations.push(citation);
      continue;
    }

    removedCitations.push({
      id: citation.id,
      label: citation.label,
      source: citation.source,
      reason: 'citation not found in source registry',
    });
  }

  return {
    verifiedCitations,
    removedCitations,
  };
}
