// Best-effort, tab-local exam recovery. This is not an audited attempt or a
// source of truth: the server still validates the complete exam definition.
export type ExamDraft = {
  version: string;
  attempt: number;
  currentQ: number;
  answers: Record<string, string>;
  optionOrder: Record<string, string[]>;
  savedAt: number;
};
export type DraftQuestion = { id: string; optionKeys: string[] };
const MAX_AGE_MS = 48 * 60 * 60 * 1000;
export function examDraftKey(profileId: string, assignmentId: string, testId: string) {
  return `ciguena:exam-draft:v1:${profileId}:${assignmentId}:${testId}`;
}
export function examDraftVersion(test: unknown) {
  // A compatibility fingerprint, not a cryptographic authorization check.
  const text = JSON.stringify(test) ?? '';
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return `${text.length}:${(hash >>> 0).toString(16)}`;
}
export function clearExamDraft(key: string | null) {
  if (!key) return;
  try { sessionStorage.removeItem(key); } catch { /* storage may be unavailable */ }
}
export function writeExamDraft(key: string | null, draft: ExamDraft) {
  if (!key) return false;
  try { sessionStorage.setItem(key, JSON.stringify(draft)); return true; }
  catch { return false; }
}
export function readExamDraft(key: string | null, version: string, attempt: number, questions: DraftQuestion[]): ExamDraft | null {
  if (!key) return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const draft = JSON.parse(raw) as ExamDraft;
    if (!draft || draft.version !== version || draft.attempt !== attempt ||
      !Number.isFinite(draft.savedAt) || Date.now() - draft.savedAt > MAX_AGE_MS || draft.savedAt > Date.now() + 60000 ||
      !Number.isInteger(draft.currentQ) || draft.currentQ < 0 || draft.currentQ >= questions.length ||
      !draft.answers || typeof draft.answers !== 'object' || Array.isArray(draft.answers) ||
      !draft.optionOrder || typeof draft.optionOrder !== 'object' || Array.isArray(draft.optionOrder)) {
      clearExamDraft(key); return null;
    }
    for (const q of questions) {
      const order = draft.optionOrder[q.id];
      if (!Array.isArray(order) || order.length !== q.optionKeys.length ||
        new Set(order).size !== order.length || order.some(k => !q.optionKeys.includes(k))) {
        clearExamDraft(key); return null;
      }
    }
    for (const [id, answer] of Object.entries(draft.answers)) {
      const q = questions.find(question => question.id === id);
      if (!q || !q.optionKeys.includes(answer)) { clearExamDraft(key); return null; }
    }
    return draft;
  } catch { clearExamDraft(key); return null; }
}
