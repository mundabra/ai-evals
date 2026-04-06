import type { GroundingFixture } from '@mundabra/ai-evals';

export const groundingFixtures: GroundingFixture[] = [
  {
    name: 'valid exact id match',
    category: 'valid_exact',
    registryEntries: [
      {
        id: 'doc_1',
        kind: 'prompt_document',
        label: 'drive: Account Brief',
        source: 'drive',
      },
    ],
    candidateCitations: [
      { id: 'doc_1', label: 'drive: Account Brief', source: 'drive' },
    ],
    expected: {
      verificationScope: 'source',
      status: 'verified',
      candidateCount: 1,
      attachedCount: 1,
      removedCount: 0,
      sourceCount: 1,
    },
  },
  {
    name: 'valid exact label and source fallback',
    category: 'valid_exact',
    registryEntries: [
      {
        id: 'doc_2',
        kind: 'tool_document',
        label: 'crm: Renewal Notes',
        source: 'crm',
        originTool: 'search_corpus',
      },
    ],
    candidateCitations: [
      { id: 'doc_2', label: 'crm: Renewal Notes', source: 'crm' },
    ],
    emittedCitations: [
      { id: 'doc_999', label: 'crm: Renewal Notes', source: 'crm' },
    ],
    expected: {
      verificationScope: 'source',
      status: 'verified',
      candidateCount: 1,
      attachedCount: 1,
      removedCount: 0,
      sourceCount: 1,
    },
  },
  {
    name: 'invalid fabricated id',
    category: 'invalid',
    registryEntries: [
      {
        id: 'doc_1',
        kind: 'prompt_document',
        label: 'drive: Account Brief',
        source: 'drive',
      },
    ],
    candidateCitations: [
      { id: 'doc_404', label: 'drive: Missing Brief', source: 'drive' },
    ],
    expected: {
      verificationScope: 'source',
      status: 'unverified',
      candidateCount: 1,
      attachedCount: 0,
      removedCount: 1,
      sourceCount: 1,
    },
  },
  {
    name: 'invalid fabricated label and source',
    category: 'invalid',
    registryEntries: [
      {
        id: 'doc_1',
        kind: 'prompt_document',
        label: 'drive: Account Brief',
        source: 'drive',
      },
    ],
    candidateCitations: [
      { id: 'doc_999', label: 'web: Fabricated Source', source: 'web' },
    ],
    expected: {
      verificationScope: 'source',
      status: 'unverified',
      candidateCount: 1,
      attachedCount: 0,
      removedCount: 1,
      sourceCount: 1,
    },
  },
  {
    name: 'mixed one valid and one invalid',
    category: 'mixed',
    registryEntries: [
      {
        id: 'doc_1',
        kind: 'prompt_document',
        label: 'drive: Account Brief',
        source: 'drive',
      },
    ],
    candidateCitations: [
      { id: 'doc_1', label: 'drive: Account Brief', source: 'drive' },
      { id: 'doc_404', label: 'web: Missing', source: 'web' },
    ],
    expected: {
      verificationScope: 'source',
      status: 'partial',
      candidateCount: 2,
      attachedCount: 1,
      removedCount: 1,
      sourceCount: 1,
    },
  },
  {
    name: 'mixed fallback success plus fabricated source',
    category: 'mixed',
    registryEntries: [
      {
        id: 'doc_2',
        kind: 'tool_document',
        label: 'crm: Renewal Notes',
        source: 'crm',
        originTool: 'search_corpus',
      },
      {
        id: 'doc_3',
        kind: 'prompt_document',
        label: 'drive: Call Notes',
        source: 'drive',
      },
    ],
    candidateCitations: [
      { id: 'doc_2', label: 'crm: Renewal Notes', source: 'crm' },
      { id: 'doc_404', label: 'crm: Missing', source: 'crm' },
    ],
    emittedCitations: [
      { id: 'doc_999', label: 'crm: Renewal Notes', source: 'crm' },
      { id: 'doc_404', label: 'crm: Missing', source: 'crm' },
    ],
    expected: {
      verificationScope: 'source',
      status: 'partial',
      candidateCount: 2,
      attachedCount: 1,
      removedCount: 1,
      sourceCount: 2,
    },
  },
  {
    name: 'empty sources',
    category: 'empty_sources',
    registryEntries: [],
    candidateCitations: [],
    expected: {
      verificationScope: 'source',
      status: 'unverified',
      candidateCount: 0,
      attachedCount: 0,
      removedCount: 0,
      sourceCount: 0,
    },
  },
  {
    name: 'sources exist but none are attached',
    category: 'empty_attached',
    registryEntries: [
      {
        id: 'doc_1',
        kind: 'prompt_document',
        label: 'drive: Account Brief',
        source: 'drive',
      },
    ],
    candidateCitations: [
      { id: 'doc_1', label: 'drive: Account Brief', source: 'drive' },
    ],
    emittedCitations: [],
    expected: {
      verificationScope: 'source',
      status: 'unverified',
      candidateCount: 1,
      attachedCount: 0,
      removedCount: 0,
      sourceCount: 1,
    },
  },
  {
    name: 'tool capture nested document output',
    category: 'tool_capture',
    registryEntries: [],
    toolCaptures: [
      {
        toolName: 'search_corpus',
        output: {
          results: [
            {
              id: 'doc_7',
              title: 'Implementation Notes',
              source: 'drive',
              content: 'captured from tool output',
            },
          ],
        },
      },
    ],
    candidateCitations: [
      { id: 'doc_7', label: 'drive: Implementation Notes', source: 'drive' },
    ],
    expected: {
      verificationScope: 'source',
      status: 'verified',
      candidateCount: 1,
      attachedCount: 1,
      removedCount: 0,
      sourceCount: 1,
    },
  },
  {
    name: 'url normalization strips tracking params and fragments',
    category: 'url_normalization',
    registryEntries: [],
    toolCaptures: [
      {
        toolName: 'browser_research',
        output: {
          title: 'Example Article',
          url: 'https://example.com/report/?utm_campaign=test#summary',
        },
      },
    ],
    candidateCitations: [
      {
        id: 'url:https://example.com/report',
        label: 'Example Article',
        source: 'example.com',
      },
    ],
    expected: {
      verificationScope: 'source',
      status: 'verified',
      candidateCount: 1,
      attachedCount: 1,
      removedCount: 0,
      sourceCount: 1,
    },
  },
  {
    name: 'url normalization strips trailing slash and keeps title label',
    category: 'url_normalization',
    registryEntries: [],
    toolCaptures: [
      {
        toolName: 'browser_research',
        output: {
          items: [
            {
              name: 'Forecast',
              href: 'https://example.com/briefing/?utm_source=newsletter',
            },
          ],
        },
      },
    ],
    candidateCitations: [
      {
        id: 'url:https://example.com/briefing',
        label: 'Forecast',
        source: 'example.com',
      },
    ],
    expected: {
      verificationScope: 'source',
      status: 'verified',
      candidateCount: 1,
      attachedCount: 1,
      removedCount: 0,
      sourceCount: 1,
    },
  },
  {
    name: 'label source fallback succeeds with wrong id',
    category: 'label_source_fallback',
    registryEntries: [
      {
        id: 'doc_8',
        kind: 'prompt_document',
        label: 'drive: Customer Plan',
        source: 'drive',
      },
    ],
    candidateCitations: [
      { id: 'doc_8', label: 'drive: Customer Plan', source: 'drive' },
    ],
    emittedCitations: [
      { id: 'doc_999', label: 'drive: Customer Plan', source: 'drive' },
    ],
    expected: {
      verificationScope: 'source',
      status: 'verified',
      candidateCount: 1,
      attachedCount: 1,
      removedCount: 0,
      sourceCount: 1,
    },
  },
  {
    name: 'label source fallback rejects different source',
    category: 'label_source_fallback',
    registryEntries: [
      {
        id: 'doc_8',
        kind: 'prompt_document',
        label: 'drive: Customer Plan',
        source: 'drive',
      },
    ],
    candidateCitations: [
      { id: 'doc_8', label: 'drive: Customer Plan', source: 'drive' },
    ],
    emittedCitations: [
      { id: 'doc_999', label: 'drive: Customer Plan', source: 'gmail' },
    ],
    expected: {
      verificationScope: 'source',
      status: 'unverified',
      candidateCount: 1,
      attachedCount: 0,
      removedCount: 1,
      sourceCount: 1,
    },
  },
  {
    name: 'ambiguity rejection fails closed',
    category: 'ambiguity_rejection',
    registryEntries: [
      {
        id: 'doc_11',
        kind: 'prompt_document',
        label: 'drive: Shared Title',
        source: 'drive',
      },
      {
        id: 'doc_12',
        kind: 'tool_document',
        label: 'drive: Shared Title',
        source: 'drive',
        originTool: 'search_corpus',
      },
    ],
    candidateCitations: [
      { id: 'doc_999', label: 'drive: Shared Title', source: 'drive' },
    ],
    expected: {
      verificationScope: 'source',
      status: 'unverified',
      candidateCount: 1,
      attachedCount: 0,
      removedCount: 1,
      sourceCount: 2,
    },
  },
];
