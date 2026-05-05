import { startTransition, useCallback, useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent } from 'react';
import { Header } from '../components/Header';
import { LoadingImage } from '../components/LoadingImage';
import { useAuth } from '../hooks/useAuth';
import { getPublicImageUrl } from '../lib/feedback';
import { getSupabaseBrowserClient, type BrowserSupabaseClient } from '../lib/supabase-client';
import type { FeedbackEntry } from '../types';

const MAX_FEEDBACK_LENGTH = 1000;
const MAX_FILES = 3;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const FEEDBACK_SELECT =
  'id,is_anonymous,x_username,x_avatar_url,x_followers_count,x_account_created_at,is_suspicious,title,feedback_text,image_paths,owner_response,owner_response_at,created_at';

function isAccountYoung(entry: FeedbackEntry): boolean {
  if (!entry.x_account_created_at) return false;
  const created = new Date(entry.x_account_created_at).getTime();
  const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
  return !Number.isNaN(created) && created > oneYearAgo;
}

function isSuspicious(entry: FeedbackEntry): boolean {
  return entry.is_suspicious || isAccountYoung(entry);
}

function getSuspiciousReasons(entry: FeedbackEntry): string[] {
  const reasons: string[] = [];
  if (entry.is_anonymous) {
    reasons.push('No X account linked');
  }
  if (!entry.is_anonymous && (entry.x_followers_count === null || entry.x_followers_count < 500)) {
    reasons.push('Fewer than 500 followers');
  }
  if (isAccountYoung(entry)) {
    reasons.push('Account less than 1 year old');
  }
  return reasons;
}

function clampStyle(lines: number): CSSProperties {
  return {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: lines,
    overflow: 'hidden',
  };
}

function formatStaticDate(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

function formatRelativeTime(timestamp: string): string {
  const target = new Date(timestamp).getTime();
  if (Number.isNaN(target)) {
    return timestamp;
  }

  const diffSeconds = Math.round((target - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
  ];

  for (const [unit, size] of units) {
    if (Math.abs(diffSeconds) >= size) {
      return formatter.format(Math.round(diffSeconds / size), unit);
    }
  }

  return formatter.format(diffSeconds, 'second');
}

function getXHref(username: string | null): string | null {
  if (!username) {
    return null;
  }

  return `https://x.com/${username}`;
}

function getAvatarFallback(username: string | null): string {
  return (username?.charAt(0) ?? '?').toUpperCase();
}

function validateFiles(files: File[]): string | null {
  if (files.length > MAX_FILES) {
    return `You can upload up to ${MAX_FILES} images per feedback entry.`;
  }

  for (const file of files) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `${file.name} is not a supported image type.`;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `${file.name} is larger than 5MB.`;
    }
  }

  return null;
}

async function fetchFeedbackEntries(client: BrowserSupabaseClient): Promise<FeedbackEntry[]> {
  const { data, error } = await client
    .from('feedback')
    .select(FEEDBACK_SELECT)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as FeedbackEntry[];
}

interface FeedbackPageProps {
  feedback?: FeedbackEntry[];
}

export function FeedbackPage({ feedback }: FeedbackPageProps) {
  const supabase = getSupabaseBrowserClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { user, session, loading, xProfile, signInWithTwitter, signOut } = useAuth();
  const hasSSRData = feedback !== undefined && feedback.length > 0;
  const [feedbackEntries, setFeedbackEntries] = useState<FeedbackEntry[]>(feedback ?? []);
  const [feedbackText, setFeedbackText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [expandedEntries, setExpandedEntries] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [anonymousMode, setAnonymousMode] = useState(false);
  const [anonText, setAnonText] = useState('');
  const [anonSubmitting, setAnonSubmitting] = useState(false);
  const [anonError, setAnonError] = useState<string | null>(null);
  const [keepPrivate, setKeepPrivate] = useState(false);
  const [showSuspicious, setShowSuspicious] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);

  // Fetch client-side when navigated to without SSR data
  useEffect(() => {
    if (!hasSSRData && supabase) {
      void fetchFeedbackEntries(supabase).then((entries) => {
        startTransition(() => setFeedbackEntries(entries));
      }).catch(() => undefined);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshFeedback = async () => {
    if (!supabase) {
      return;
    }

    const nextEntries = await fetchFeedbackEntries(supabase);
    startTransition(() => {
      setFeedbackEntries(nextEntries);
    });
  };

  const handleSignIn = async () => {
    setAuthError(null);

    try {
      await signInWithTwitter();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to start X sign-in.');
    }
  };

  const handleSignOut = async () => {
    setAuthError(null);

    try {
      await signOut();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to sign out.');
    }
  };

  const handleAnonSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = anonText.trim();
    if (!trimmed) {
      setAnonError('Feedback cannot be empty.');
      return;
    }
    if (trimmed.length > MAX_FEEDBACK_LENGTH) {
      setAnonError(`Feedback must be ${MAX_FEEDBACK_LENGTH} characters or fewer.`);
      return;
    }

    setAnonSubmitting(true);
    setAnonError(null);

    try {
      const response = await fetch('/api/feedback/anonymous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback_text: trimmed, is_private: keepPrivate }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: 'Submission failed.' }));
        throw new Error(body.error ?? 'Submission failed.');
      }

      setAnonText('');
      setAnonymousMode(false);
      setKeepPrivate(false);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 4000);
      if (!keepPrivate) await refreshFeedback();
    } catch (error) {
      setAnonError(error instanceof Error ? error.message : 'Failed to submit feedback.');
    } finally {
      setAnonSubmitting(false);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const validationError = validateFiles(files);

    if (validationError) {
      setFormError(validationError);
      setSelectedFiles([]);
      event.target.value = '';
      return;
    }

    setFormError(null);
    setSelectedFiles(files);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase || !session || !user) {
      setFormError('You need to sign in with X before submitting feedback.');
      return;
    }

    const trimmedFeedback = feedbackText.trim();
    if (!trimmedFeedback) {
      setFormError('Feedback cannot be empty.');
      return;
    }

    if (trimmedFeedback.length > MAX_FEEDBACK_LENGTH) {
      setFormError(`Feedback must be ${MAX_FEEDBACK_LENGTH} characters or fewer.`);
      return;
    }

    const validationError = validateFiles(selectedFiles);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const uploadedPaths: string[] = [];
    setSubmitting(true);
    setFormError(null);

    try {
      for (const file of selectedFiles) {
        const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : '';
        const safeExtension = extension || 'bin';
        const uploadPath = `${user.id}/${crypto.randomUUID()}.${safeExtension}`;
        const { error } = await supabase.storage.from('feedback-images').upload(uploadPath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

        if (error) {
          throw error;
        }

        uploadedPaths.push(uploadPath);
      }

      const { error } = await supabase.from('feedback').insert({
        user_id: user.id,
        is_private: keepPrivate,
        x_username: xProfile?.username ?? user.user_metadata?.user_name ?? null,
        x_user_id: xProfile?.x_user_id ?? user.user_metadata?.provider_id ?? user.user_metadata?.sub ?? null,
        x_avatar_url: xProfile?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
        x_followers_count: xProfile?.followers_count ?? null,
        x_account_created_at: xProfile?.account_created_at ?? null,
        feedback_text: trimmedFeedback,
        image_paths: uploadedPaths,
      });

      if (error) {
        throw error;
      }

      // Fire-and-forget tweet notification (skip for private feedback)
      if (!keepPrivate) {
        void fetch('/api/feedback/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            x_username: xProfile?.username ?? user.user_metadata?.user_name ?? null,
            x_avatar_url: xProfile?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
            feedback_text: trimmedFeedback,
          }),
        }).catch(() => undefined);
      }

      setFeedbackText('');
      setSelectedFiles([]);
      setKeepPrivate(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 4000);
      await refreshFeedback();
    } catch (error) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from('feedback-images').remove(uploadedPaths).catch(() => undefined);
      }
      setFormError(error instanceof Error ? error.message : 'Failed to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <Header activeTab="assorted" />
      <div id="sorted-section" className="content-section">
        <div className="sorted-section-content">
          <div className="sorted-breadcrumb">
            <a href="/assorted">Assorted</a> / Feedback
          </div>

          <section className="rounded-[20px] border border-[rgba(145,118,90,0.22)] bg-[linear-gradient(135deg,rgba(255,250,242,0.95),rgba(247,238,227,0.9))] p-6 shadow-[0_20px_50px_rgba(89,61,36,0.08)] sm:p-8">
            <div>
              <p className="font-display text-[0.75rem] uppercase tracking-[0.28em] text-[#9c7a5d]">Public criticism</p>
              <h1 className="mt-2 font-display text-[2rem] leading-[1.05] text-[#2f2216] sm:text-[2.5rem]">
                Share public feedback or criticism for POM. Attach receipts.
              </h1>
              <p className="mt-3 text-[0.88rem] leading-[1.8] text-[#6a5a4d]">
                In the spirit of openness, anyone can share open feedback or criticism that will live forever here. Anonymous or questionable entries — accounts newer than one year or with fewer than 500 followers — will be flagged as potentially questionable but still listed.
              </p>
            </div>

            <div className="mt-6 rounded-[18px] border border-[rgba(145,118,90,0.18)] bg-[rgba(255,255,255,0.74)] p-5">
              {loading ? (
                <p className="text-[0.82rem] text-[#7c6a5b]">Checking your X session...</p>
              ) : !user && !anonymousMode ? (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleSignIn}
                      className="inline-flex w-fit items-center justify-center rounded-full bg-[#2f2216] px-5 py-2.5 font-display text-[0.95rem] text-[#fff6ea] transition hover:bg-[#1f140d]"
                    >
                      Validate identity with X
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnonymousMode(true)}
                      className="inline-flex w-fit items-center justify-center rounded-full border border-[rgba(145,118,90,0.24)] px-5 py-2.5 font-display text-[0.95rem] text-[#6a5a4d] transition hover:border-[rgba(145,118,90,0.42)] hover:text-[#2f2216]"
                    >
                      Submit anonymously
                    </button>
                  </div>
                  <p className="text-[0.8rem] leading-[1.7] text-[#7c6a5b]">
                    Sign in to attach your identity, or submit anonymously.
                  </p>
                  {authError ? <p className="text-[0.8rem] text-[#a93f34]">{authError}</p> : null}
                  {submitSuccess ? <div className="rounded-lg border border-[rgba(74,122,93,0.3)] bg-[rgba(74,122,93,0.08)] px-4 py-3 text-[0.84rem] text-[#4a7a5d]">Feedback submitted successfully.</div> : null}
                </div>
              ) : !user && anonymousMode ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <p className="font-display text-[1rem] text-[#2f2216]">Anonymous feedback</p>
                    <button
                      type="button"
                      onClick={() => { setAnonymousMode(false); setAnonError(null); }}
                      className="text-[0.82rem] text-[#8b6a4f] underline underline-offset-4"
                    >
                      Sign in with X instead
                    </button>
                  </div>
                  <p className="text-[0.8rem] leading-[1.7] text-[#7c6a5b]">
                    Anonymous entries are shown with an &ldquo;Anonymous&rdquo; label. Text only — no image uploads.
                  </p>
                  <form onSubmit={handleAnonSubmit} className="flex flex-col gap-4">
                    <textarea
                      value={anonText}
                      onChange={(event) => setAnonText(event.target.value.slice(0, MAX_FEEDBACK_LENGTH))}
                      maxLength={MAX_FEEDBACK_LENGTH}
                      rows={6}
                      placeholder="Your anonymous feedback..."
                      className="min-h-[160px] rounded-[16px] border border-[rgba(145,118,90,0.22)] bg-[rgba(255,253,249,0.95)] px-4 py-3 text-[0.92rem] leading-[1.7] text-[#2f2216] outline-none transition focus:border-[rgba(99,72,47,0.55)]"
                    />
                    <div className="flex items-center justify-between text-[0.75rem] text-[#7c6a5b]">

                      <span>{anonText.length}/{MAX_FEEDBACK_LENGTH}</span>
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 text-[0.82rem] text-[#6a5a4d]">
                      <input
                        type="checkbox"
                        checked={keepPrivate}
                        onChange={(e) => setKeepPrivate(e.target.checked)}
                        className="accent-[#9c7a5d]"
                      />
                      Keep this private (only visible to POM)
                    </label>
                    {anonError ? <p className="text-[0.8rem] text-[#a93f34]">{anonError}</p> : null}
                    <button
                      type="submit"
                      disabled={anonSubmitting}
                      className="inline-flex w-fit items-center justify-center rounded-full bg-[#9c7a5d] px-5 py-2.5 font-display text-[0.95rem] text-[#fff8f0] transition hover:bg-[#7e5f46] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {anonSubmitting ? 'Submitting...' : keepPrivate ? 'Submit privately' : 'Submit anonymous feedback'}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      {xProfile?.avatar_url ? (
                        <LoadingImage
                          src={xProfile.avatar_url}
                          alt={xProfile.username ? `@${xProfile.username}` : 'X avatar'}
                          className="h-12 w-12 rounded-full border border-[rgba(145,118,90,0.2)] object-cover"
                          wrapperClassName="inline-block h-12 w-12 rounded-full"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(145,118,90,0.2)] bg-[rgba(255,247,236,0.85)] font-display text-[#7a5b44]">
                          {getAvatarFallback(xProfile?.username ?? user.user_metadata?.user_name ?? null)}
                        </div>
                      )}
                      <div>
                        <p className="font-display text-[1rem] text-[#2f2216]">
                          @{xProfile?.username ?? user.user_metadata?.user_name ?? 'anonymous'}
                        </p>
                        <p className="text-[0.78rem] text-[#7c6a5b]">
                          {xProfile?.followers_count !== null && xProfile?.followers_count !== undefined
                            ? `${xProfile.followers_count.toLocaleString()} followers`
                            : 'Follower count unavailable. New feedback will be flagged questionable.'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="inline-flex w-fit items-center justify-center rounded-full border border-[rgba(145,118,90,0.24)] px-4 py-2 text-[0.82rem] text-[#6a5a4d] transition hover:border-[rgba(145,118,90,0.42)] hover:text-[#2f2216]"
                    >
                      Sign out
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <label className="flex flex-col gap-2">
                      <span className="font-display text-[0.95rem] text-[#2f2216]">Feedback</span>
                      <textarea
                        value={feedbackText}
                        onChange={(event) => setFeedbackText(event.target.value.slice(0, MAX_FEEDBACK_LENGTH))}
                        maxLength={MAX_FEEDBACK_LENGTH}
                        rows={6}
                        placeholder="Positive, negative, specific, vague. Your choice."
                        className="min-h-[160px] rounded-[16px] border border-[rgba(145,118,90,0.22)] bg-[rgba(255,253,249,0.95)] px-4 py-3 text-[0.92rem] leading-[1.7] text-[#2f2216] outline-none transition focus:border-[rgba(99,72,47,0.55)]"
                      />
                    </label>
                    <div className="flex justify-end text-[0.75rem] text-[#7c6a5b]">
                      <span>{feedbackText.length}/{MAX_FEEDBACK_LENGTH}</span>
                    </div>

                    <div className="flex flex-col gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={ACCEPTED_TYPES.join(',')}
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-[16px] border border-dashed border-[rgba(145,118,90,0.3)] bg-[rgba(255,250,244,0.85)] px-4 py-3 text-[0.82rem] text-[#6a5a4d] transition hover:border-[rgba(145,118,90,0.5)] hover:bg-[rgba(255,247,236,0.95)]"
                      >
                        Attach images (optional)
                      </button>
                    </div>

                    {selectedFiles.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedFiles.map((file) => (
                          <span
                            key={`${file.name}-${file.size}`}
                            className="rounded-full bg-[rgba(145,118,90,0.1)] px-3 py-1 text-[0.74rem] text-[#6a5a4d]"
                          >
                            {file.name}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <label className="flex cursor-pointer items-center gap-2 text-[0.82rem] text-[#6a5a4d]">
                      <input
                        type="checkbox"
                        checked={keepPrivate}
                        onChange={(e) => setKeepPrivate(e.target.checked)}
                        className="accent-[#9c7a5d]"
                      />
                      Keep this private (only visible to POM)
                    </label>

                    {formError ? <p className="text-[0.8rem] text-[#a93f34]">{formError}</p> : null}
                    {submitSuccess ? <div className="rounded-lg border border-[rgba(74,122,93,0.3)] bg-[rgba(74,122,93,0.08)] px-4 py-3 text-[0.84rem] text-[#4a7a5d]">Feedback submitted successfully.</div> : null}
                    {authError ? <p className="text-[0.8rem] text-[#a93f34]">{authError}</p> : null}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex w-fit items-center justify-center rounded-full bg-[#9c7a5d] px-5 py-2.5 font-display text-[0.95rem] text-[#fff8f0] transition hover:bg-[#7e5f46] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? 'Submitting...' : keepPrivate ? 'Submit privately' : 'Submit feedback'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </section>

          <section className="mt-8 flex flex-col gap-4 pb-16">
            {feedbackEntries.length > 0 && feedbackEntries.some((e) => isSuspicious(e)) ? (
              <label className="flex cursor-pointer items-center gap-2 text-[0.82rem] text-[#6a5a4d]">
                <input
                  type="checkbox"
                  checked={showSuspicious}
                  onChange={(e) => setShowSuspicious(e.target.checked)}
                  className="accent-[#9c7a5d]"
                />
                Show {feedbackEntries.filter((e) => isSuspicious(e)).length} questionable {feedbackEntries.filter((e) => isSuspicious(e)).length === 1 ? 'entry' : 'entries'}
              </label>
            ) : null}
            {feedbackEntries.length === 0 ? (
              <div className="rounded-[18px] border border-[rgba(145,118,90,0.16)] bg-[rgba(255,255,255,0.76)] p-6 text-[0.84rem] text-[#7c6a5b]">
                No feedback yet.
              </div>
            ) : (
              feedbackEntries.filter((entry) => showSuspicious || !isSuspicious(entry)).map((entry) => {
                const expanded = Boolean(expandedEntries[entry.id]);
                const xHref = getXHref(entry.x_username);
                const hasExpandableContent = entry.feedback_text.length > 150 || entry.image_paths.length > 0 || Boolean(entry.owner_response);

                return (
                  <article
                    key={entry.id}
                    className="rounded-[18px] border border-[rgba(145,118,90,0.16)] bg-[rgba(255,255,255,0.8)] p-5 shadow-[0_14px_35px_rgba(89,61,36,0.06)]"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-center gap-3">
                        {entry.is_anonymous ? (
                          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(145,118,90,0.18)] bg-[rgba(240,235,228,0.85)] font-display text-[0.9rem] text-[#8a7868]">
                            ?
                          </div>
                        ) : entry.x_avatar_url ? (
                          <LoadingImage
                            src={entry.x_avatar_url}
                            alt={entry.x_username ? `@${entry.x_username}` : 'Feedback avatar'}
                            className="h-11 w-11 rounded-full border border-[rgba(145,118,90,0.18)] object-cover"
                            wrapperClassName="inline-block h-11 w-11 rounded-full"
                          />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(145,118,90,0.18)] bg-[rgba(255,247,236,0.85)] font-display text-[#7a5b44]">
                            {getAvatarFallback(entry.x_username)}
                          </div>
                        )}
                        <div>
                          {entry.is_anonymous ? (
                            <p className="font-display text-[1rem] text-[#8a7868]">Anonymous</p>
                          ) : xHref ? (
                            <a
                              href={xHref}
                              target="_blank"
                              rel="noreferrer"
                              className="font-display text-[1rem] text-[#2f2216] underline decoration-[rgba(145,118,90,0.26)] underline-offset-4"
                            >
                              @{entry.x_username}
                            </a>
                          ) : (
                            <p className="font-display text-[1rem] text-[#2f2216]">Unknown account</p>
                          )}
                          <p className="text-[0.76rem] text-[#8a7868]" title={new Date(entry.created_at).toLocaleString()}>
                            {hydrated ? formatRelativeTime(entry.created_at) : formatStaticDate(entry.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {isSuspicious(entry) ? getSuspiciousReasons(entry).map((reason) => (
                          <span
                            key={reason}
                            className="rounded-full bg-[rgba(169,63,52,0.1)] px-3 py-1 text-[0.72rem] uppercase tracking-[0.18em] text-[#a93f34]"
                          >
                            {reason}
                          </span>
                        )) : null}
                      </div>
                    </div>

                    <div className="mt-4 space-y-4">
                      {entry.title ? (
                        <p className="font-display text-[1.05rem] leading-[1.3] text-[#2f2216]">{entry.title}</p>
                      ) : null}
                      <p className="whitespace-pre-wrap text-[0.86rem] leading-[1.8] text-[#594a3f]" style={expanded ? undefined : clampStyle(3)}>
                        {entry.feedback_text}
                      </p>

                      {entry.owner_response ? (
                        <div className="rounded-[16px] bg-[rgba(252,247,239,0.92)] p-4">
                          <p className="mb-1 font-display text-[0.78rem] uppercase tracking-[0.18em] text-[#9c7a5d]">Response</p>
                          <p
                            className="whitespace-pre-wrap text-[0.84rem] leading-[1.75] text-[#69594d]"
                            style={expanded ? undefined : clampStyle(5)}
                          >
                            {entry.owner_response}
                          </p>
                        </div>
                      ) : null}

                      {expanded && entry.image_paths.length > 0 ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {entry.image_paths.map((imagePath) => (
                            <LoadingImage
                              key={imagePath}
                              src={getPublicImageUrl(imagePath)}
                              alt="Attached feedback evidence"
                              className="w-full rounded-[16px] border border-[rgba(145,118,90,0.14)] bg-[rgba(255,250,244,0.85)] object-cover"
                              wrapperClassName="block feedback-attachment-shell"
                              loading="lazy"
                            />
                          ))}
                        </div>
                      ) : null}

                      {hasExpandableContent ? (
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedEntries((current) => ({
                              ...current,
                              [entry.id]: !current[entry.id],
                            }));
                          }}
                          className="text-[0.8rem] uppercase tracking-[0.16em] text-[#8b6a4f]"
                        >
                          {expanded ? 'Collapse' : 'Expand'}
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
