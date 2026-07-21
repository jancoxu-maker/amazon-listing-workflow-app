export function isReworkRunReady(decision, run) {
  if (!run || run.verdict !== 'usable') return false;
  const returnedAt = Date.parse(decision?.returnedAt || decision?.reviewCommittedAt || decision?.updatedAt || '');
  const generatedAt = Date.parse(run.createdAt || '');
  const generatedAfterReturn = Number.isFinite(returnedAt)
    && Number.isFinite(generatedAt)
    && generatedAt > returnedAt;
  const differsFromReturnedRun = !decision?.returnedRunId || run.id !== decision.returnedRunId;
  return generatedAfterReturn && differsFromReturnedRun;
}
