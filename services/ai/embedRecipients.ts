/**
 * embedRecipients.ts
 *
 * Job runner: reads queued recipient_embedding_jobs (batch of 50), fetches each
 * recipient_preferences row (profile_text is already computed by the DB trigger),
 * calls OpenAI, writes the profile_embedding vector back, then marks the job done.
 * On error it increments attempts and stores the error message.
 */

import {
  supabaseAdmin,
  fetchEmbeddings,
  EMBEDDING_MODEL,
  EMBEDDING_BATCH_SIZE,
  MAX_ATTEMPTS,
} from './config';

// ---------------------------------------------------------------------------
// Types matching the DB schema from migrations
// ---------------------------------------------------------------------------
interface RecipientEmbeddingJob {
  id: string;
  recipient_preferences_id: string;
  attempts: number;
}

interface RecipientPreferenceRow {
  id: string;
  profile_text: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Claim a batch of queued jobs (move to 'processing'). */
async function claimJobs(batchSize: number): Promise<RecipientEmbeddingJob[]> {
  // Select queued jobs that haven't exceeded max attempts
  const { data: jobs, error: selectError } = await supabaseAdmin
    .from('recipient_embedding_jobs')
    .select('id, recipient_preferences_id, attempts')
    .eq('status', 'queued')
    .lt('attempts', MAX_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(batchSize);

  if (selectError || !jobs || jobs.length === 0) {
    if (selectError) console.error('[embedRecipients] Select error:', selectError.message);
    return [];
  }

  const ids = jobs.map((j) => j.id);

  // Mark them as 'processing'
  const { error: updateError } = await supabaseAdmin
    .from('recipient_embedding_jobs')
    .update({ status: 'processing' })
    .in('id', ids);

  if (updateError) {
    console.error('[embedRecipients] Failed to claim jobs:', updateError.message);
    return [];
  }

  return jobs as RecipientEmbeddingJob[];
}

/** Fetch recipient_preferences rows for the given IDs. */
async function fetchRecipientPreferences(ids: string[]): Promise<RecipientPreferenceRow[]> {
  const { data, error } = await supabaseAdmin
    .from('recipient_preferences')
    .select('id, profile_text')
    .in('id', ids);

  if (error) throw new Error(`[embedRecipients] fetchRecipientPreferences error: ${error.message}`);
  return (data as RecipientPreferenceRow[]) ?? [];
}

/** Write profile_embedding + metadata back to recipient_preferences. */
async function writeRecipientEmbedding(
  recipientPreferencesId: string,
  embedding: number[]
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('recipient_preferences')
    .update({
      profile_embedding: JSON.stringify(embedding),
      profile_embedding_model: EMBEDDING_MODEL,
      profile_embedding_updated_at: new Date().toISOString(),
    })
    .eq('id', recipientPreferencesId);

  if (error) {
    throw new Error(
      `[embedRecipients] write embedding failed (${recipientPreferencesId}): ${error.message}`
    );
  }
}

/** Mark a job as done. */
async function markJobDone(jobId: string): Promise<void> {
  await supabaseAdmin
    .from('recipient_embedding_jobs')
    .update({ status: 'done' })
    .eq('id', jobId);
}

/** Mark a job as failed and store the error message. */
async function markJobError(jobId: string, errorMsg: string, currentAttempts: number): Promise<void> {
  const newAttempts = currentAttempts + 1;
  await supabaseAdmin
    .from('recipient_embedding_jobs')
    .update({
      status: newAttempts >= MAX_ATTEMPTS ? 'error' : 'queued',
      error: errorMsg.slice(0, 1000),
      attempts: newAttempts,
    })
    .eq('id', jobId);
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

export interface EmbedRecipientsResult {
  processed: number;
  failed: number;
  skipped: number;
}

export async function runEmbedRecipients(): Promise<EmbedRecipientsResult> {
  console.log('[embedRecipients] Starting recipient embedding run...');

  let totalProcessed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  while (true) {
    const jobs = await claimJobs(EMBEDDING_BATCH_SIZE);

    if (jobs.length === 0) {
      console.log('[embedRecipients] No queued jobs remaining. Done.');
      break;
    }

    console.log(`[embedRecipients] Claimed ${jobs.length} jobs`);

    const prefIds = jobs.map((j) => j.recipient_preferences_id);
    const rows = await fetchRecipientPreferences(prefIds);
    const rowMap = new Map(rows.map((r) => [r.id, r]));

    // Separate embeddable vs skippable
    const embeddable: { job: RecipientEmbeddingJob; text: string }[] = [];
    for (const job of jobs) {
      const row = rowMap.get(job.recipient_preferences_id);
      if (!row || !row.profile_text?.trim()) {
        console.warn(
          `[embedRecipients] No profile_text for recipient_preferences ${job.recipient_preferences_id}, skipping`
        );
        await markJobError(job.id, 'recipient_preferences has no profile_text', job.attempts);
        totalSkipped++;
        continue;
      }
      embeddable.push({ job, text: row.profile_text });
    }

    if (embeddable.length === 0) continue;

    // Call OpenAI
    let vectors: number[][];
    try {
      vectors = await fetchEmbeddings(embeddable.map((e) => e.text));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[embedRecipients] OpenAI batch call failed:', msg);
      await Promise.all(
        embeddable.map(({ job }) => markJobError(job.id, msg, job.attempts))
      );
      totalFailed += embeddable.length;
      continue;
    }

    // Write results back
    await Promise.all(
      embeddable.map(async ({ job }, i) => {
        try {
          await writeRecipientEmbedding(job.recipient_preferences_id, vectors[i]);
          await markJobDone(job.id);
          totalProcessed++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(
            `[embedRecipients] Failed to write embedding for ${job.recipient_preferences_id}:`,
            msg
          );
          await markJobError(job.id, msg, job.attempts);
          totalFailed++;
        }
      })
    );

    console.log(
      `[embedRecipients] Batch done — processed: ${totalProcessed}, failed: ${totalFailed}, skipped: ${totalSkipped}`
    );
  }

  return { processed: totalProcessed, failed: totalFailed, skipped: totalSkipped };
}
