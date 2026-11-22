import { kbStore } from '../grounding/store.js';
import type {
  Outcome,
  ConfidenceBand,
  CandidateMatch,
  RecognizeMatch,
  CrossCheckResult,
} from '@landmark/shared';

export interface RawCandidate {
  landmark_id: string;
  confidence: number;
  visible_cues: string[];
  missing_cues: string[];
  rationale: string;
}

export interface CalibrationResult {
  outcome: Outcome;
  match: RecognizeMatch | null;
  candidates: CandidateMatch[];
  crossCheck: CrossCheckResult;
}

export function calculateCalibration(
  rawCandidates: RawCandidate[],
  qualityIssues: string[],
  confRecognized = Number(process.env.CONF_RECOGNIZED ?? 0.6),
  confUncertain = Number(process.env.CONF_UNCERTAIN ?? 0.35)
): CalibrationResult {
  const candidates: CandidateMatch[] = rawCandidates.map((c) => ({
    landmarkId: c.landmark_id,
    confidence: Math.max(0, Math.min(1, c.confidence)),
    visibleCues: c.visible_cues || [],
    missingCues: c.missing_cues || [],
    rationale: c.rationale || '',
  }));

  const top1 = candidates[0];
  const top2 = candidates[1];

  if (!top1 || top1.landmarkId === 'none' || top1.landmarkId === '') {
    return {
      outcome: 'out_of_catalogue',
      match: null,
      candidates,
      crossCheck: { passed: true, notes: ['Model indicated structure is not in catalogue.'] },
    };
  }

  // Look up landmark in catalogue
  const landmark = kbStore.getLandmark(top1.landmarkId);
  const crossCheckNotes: string[] = [];
  let crossCheckPassed = true;

  if (!landmark) {
    crossCheckPassed = false;
    crossCheckNotes.push(`Landmark ID '${top1.landmarkId}' is not in the curated catalogue.`);
  }

  // Compute Cue Overlap
  let cueOverlap = 0;
  if (landmark && landmark.identifyingCues.length > 0) {
    const catCues = landmark.identifyingCues.map((c) => c.text.toLowerCase());
    const observedCues = top1.visibleCues.map((c) => c.toLowerCase());

    let matchCount = 0;
    for (const catCue of catCues) {
      // Check if any observed cue matches words in catalogue cue
      const catWords = catCue.split(/\s+/).filter((w) => w.length > 3);
      const isMatched = observedCues.some((obs) => {
        if (obs.includes(catCue) || catCue.includes(obs)) return true;
        const matchingWords = catWords.filter((w) => obs.includes(w));
        return matchingWords.length >= 2 || (catWords.length === 1 && matchingWords.length === 1);
      });
      if (isMatched) matchCount++;
    }

    cueOverlap = matchCount / landmark.identifyingCues.length;
    if (matchCount === 0 && top1.visibleCues.length > 0) {
      crossCheckPassed = false;
      crossCheckNotes.push('Observed visual cues do not correspond to catalogue architectural cues.');
    }
  }

  // Margin to second
  const marginToSecond = top2 ? Math.max(0, top1.confidence - top2.confidence) : top1.confidence;

  // Quality issues penalty
  const qualityPenalty = qualityIssues.length > 0 ? Math.min(0.3, qualityIssues.length * 0.1) : 0;

  // Final calibrated confidence formula (doc 06)
  const rawFinal =
    0.55 * top1.confidence +
    0.3 * cueOverlap +
    0.15 * marginToSecond -
    0.15 * qualityPenalty;

  const finalConfidence = Math.round(Math.max(0, Math.min(1, rawFinal)) * 100) / 100;

  // Determine Confidence Band
  let confidenceBand: ConfidenceBand = 'low';
  if (finalConfidence >= 0.75) confidenceBand = 'high';
  else if (finalConfidence >= 0.5) confidenceBand = 'moderate';

  // Determine Outcome
  let outcome: Outcome = 'out_of_catalogue';

  if (finalConfidence >= confRecognized && crossCheckPassed) {
    outcome = 'recognized';
  } else if (finalConfidence >= confUncertain) {
    outcome = 'uncertain';
    if (!crossCheckPassed) {
      crossCheckNotes.push('Confidence lowered due to catalogue cross-check discrepancy.');
    }
  } else {
    outcome = 'out_of_catalogue';
  }

  const match: RecognizeMatch | null =
    outcome === 'recognized' && landmark
      ? {
          landmarkId: landmark.id,
          name: landmark.name,
          confidence: finalConfidence,
          confidenceBand,
        }
      : null;

  return {
    outcome,
    match,
    candidates,
    crossCheck: {
      passed: crossCheckPassed,
      notes: crossCheckNotes,
    },
  };
}
