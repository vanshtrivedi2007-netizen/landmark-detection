import { kbStore } from './store.js';
import type { AskClaim } from '@landmark/shared';

export interface ValidatedClaimsResult {
  valid: boolean;
  claims: AskClaim[];
  droppedCount: number;
}

export function validateClaims(
  rawClaims: Array<{ text: string; evidence_ids?: string[]; evidenceIds?: string[] }>,
  allowedDocIds: Set<string>
): ValidatedClaimsResult {
  const verifiedClaims: AskClaim[] = [];
  let droppedCount = 0;

  for (const claim of rawClaims) {
    const rawIds = claim.evidenceIds || claim.evidence_ids || [];
    if (!claim.text || rawIds.length === 0) {
      droppedCount++;
      continue;
    }

    // Every evidence ID must resolve to a retrieved passage document
    const validIds: string[] = [];
    for (const id of rawIds) {
      const baseDocId = id.split('#')[0]!;
      if (allowedDocIds.has(baseDocId)) {
        validIds.push(id);
      }
    }

    if (validIds.length === 0) {
      droppedCount++;
      continue;
    }

    // Numerical & date consistency check (doc 07 section 6)
    // Numbers and 4-digit years in the claim text must appear in at least one cited passage
    const numbersInClaim = claim.text.match(/\b\d+(?:[.,]\d+)?\b/g) || [];
    let numberMismatch = false;

    if (numbersInClaim.length > 0) {
      for (const num of numbersInClaim) {
        let foundInAnyPassage = false;
        for (const evId of validIds) {
          const doc = kbStore.getEvidenceDoc(evId);
          if (doc && doc.rawBody.includes(num)) {
            foundInAnyPassage = true;
            break;
          }
        }
        if (!foundInAnyPassage) {
          numberMismatch = true;
          break;
        }
      }
    }

    if (numberMismatch) {
      droppedCount++;
      continue;
    }

    verifiedClaims.push({
      text: claim.text,
      evidenceIds: validIds,
    });
  }

  return {
    valid: verifiedClaims.length > 0,
    claims: verifiedClaims,
    droppedCount,
  };
}
