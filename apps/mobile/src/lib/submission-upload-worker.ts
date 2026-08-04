export async function registerSubmissionUploadBackgroundTask() {
  return {
    ok: false,
    reason: "Manual mobile submission is disabled. Use missionone_hk collaborator + mission hashtag with system sync.",
  };
}

export async function runSubmissionUploadWorkerNow() {
  return false;
}
