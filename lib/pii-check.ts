// Client-side PII pre-flight gate for the AI tutor (AiHelpPanel, DiagramHintPanel).
// Structured/regex categories only -- named-entity detection (student names,
// "my teacher is Mrs. Lee") is explicitly out of scope: a tutor students talk
// to naturally mentions names, and an NER model brings false positives with
// no upside here. Hard block, no override/review path -- regex-only has a low
// enough false-positive rate that one isn't needed.
//
// ponytail: regex-only, no NER -- catches SSN/email/phone/CC/address-with-number.
//           False positives on names/free text are out of scope by design.
//
// OPEN FOLLOW-UP (not yet decided): a Luhn checksum on the credit-card pattern
// would cut false positives on arbitrary 13-16 digit runs (unseparated phone
// numbers, long ID numbers). Not added yet -- current pattern is a plain
// digit-count match.

interface PiiPattern {
  label: string;
  re: RegExp;
}

const PII_PATTERNS: PiiPattern[] = [
  { label: 'SSN', re: /\b\d{3}-\d{2}-\d{4}\b/ },
  { label: 'email', re: /\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/i },
  { label: 'phone', re: /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/ },
  { label: 'credit card', re: /\b(?:\d[ -]*?){13,16}\b/ },
  {
    label: 'address',
    re: /\b\d{1,5}\s+\w+(\s\w+){0,3}\s+(street|st|avenue|ave|road|rd|drive|dr|lane|ln|blvd|court|ct)\b/i,
  },
];

/** Returns the label of the first structured-PII category found, or null. */
export function findPII(text: string): string | null {
  for (const p of PII_PATTERNS) {
    if (p.re.test(text)) return p.label;
  }
  return null;
}
