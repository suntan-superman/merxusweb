import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import {
  startReviewIntegrationOAuth,
  syncReviewIntegration,
  validateReviewIntegrationOAuth,
} from '../../api/reviews';
import {
  useReviewOnboarding,
  useSendReviewOnboardingTestNotification,
  useUpdateReviewOnboarding,
} from '../../hooks/useReviewQueries';

const STEPS = [
  'Welcome',
  'Review sources',
  'Connect account',
  'Choose locations',
  'Validate connection',
  'First import',
  'Alert preferences',
  'Response style',
  'Approval workflow',
  'Approvers',
  'Private feedback',
  'Review setup',
  'Ready',
];

const PROVIDER_LABELS = {
  google: 'Google Business Profile',
  facebook: 'Facebook',
  trustpilot: 'Trustpilot',
};

function tenantPaths(tenantType) {
  const base = tenantType === 'restaurant' ? '/restaurant' : tenantType === 'real_estate' ? '/estate' : '/voice';
  return {
    base,
    setup: `${base}/feedback/setup`,
    integrations: `${base}/feedback/integrations`,
    reviews: `${base}/reviews`,
    feedback: `${base}/feedback`,
  };
}

function actorFromClaims(claims = {}) {
  return {
    uid: claims.uid || claims.user_id || null,
    email: claims.email || null,
    name: claims.name || claims.displayName || claims.email || 'Account owner',
    role: String(claims.role || 'owner').toLowerCase(),
  };
}

function StepShell({ title, description, children }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
      <div className="mt-6">{children}</div>
    </div>
  );
}

function CheckOption({ checked, onChange, title, description, disabled = false }) {
  return (
    <label className={`flex gap-3 rounded-2xl border p-4 ${disabled ? 'cursor-not-allowed bg-slate-50 opacity-65' : 'cursor-pointer bg-white hover:border-emerald-300'}`}>
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} className="mt-1 h-4 w-4" />
      <span>
        <span className="block font-semibold text-slate-900">{title}</span>
        {description ? <span className="mt-1 block text-sm text-slate-600">{description}</span> : null}
      </span>
    </label>
  );
}

export default function ReviewOnboardingWizard({ tenantType }) {
  const paths = tenantPaths(tenantType);
  const { userClaims } = useAuth();
  const [searchParams] = useSearchParams();
  const query = useReviewOnboarding();
  const update = useUpdateReviewOnboarding();
  const testNotification = useSendReviewOnboardingTestNotification();
  const initialized = useRef(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    selectedProviders: ['google'],
    locationIds: [],
    alertChannels: ['web', 'email', 'push'],
    alertEvents: ['negative_review', 'review_spike', 'review_sync_failed'],
    responsePolicy: {
      tone: 'warm_professional',
      length: 'concise',
      language: 'match_reviewer',
      signoff: '',
      escalationRatingAtOrBelow: 2,
      requireApproval: true,
    },
    approvers: [],
    feedback: {
      enabled: false,
      triggerOnPostCall: true,
      triggerOnInboundSms: false,
    },
  });
  const [busyAction, setBusyAction] = useState('');
  const onboarding = query.data?.onboarding;

  useEffect(() => {
    if (!onboarding || initialized.current) return;
    initialized.current = true;
    const currentActor = actorFromClaims(userClaims);
    setStep(Math.max(0, Math.min(12, Number(onboarding.currentStep) || 0)));
    setForm({
      selectedProviders: onboarding.selectedProviders?.length ? onboarding.selectedProviders : ['google'],
      locationIds: onboarding.locationSelection?.locationIds || [],
      alertChannels: onboarding.alertPreferences?.channels || ['web', 'email', 'push'],
      alertEvents: onboarding.alertPreferences?.events || ['negative_review', 'review_spike', 'review_sync_failed'],
      responsePolicy: onboarding.responsePolicy || {},
      approvers: onboarding.approvers?.length ? onboarding.approvers : [currentActor],
      feedback: onboarding.feedback || {},
    });
  }, [onboarding, userClaims]);

  useEffect(() => {
    const oauth = searchParams.get('reviewOAuth');
    const message = searchParams.get('reviewMessage');
    if (oauth === 'connected') toast.success(message || 'Review account connected.');
    if (oauth === 'error') toast.error(message || 'Review account connection failed.');
  }, [searchParams]);

  const capabilities = onboarding?.capabilities || {};
  const selectedProvider = form.selectedProviders[0] || 'google';
  const connection = onboarding?.providerConnections?.[selectedProvider] || {};
  const integration = (onboarding?.integrations || []).find((item) => item.key === selectedProvider);
  const availableProviders = useMemo(
    () => Object.keys(PROVIDER_LABELS).filter((provider) => capabilities[provider]?.visible || provider === 'google'),
    [capabilities]
  );
  const completedSteps = new Set(onboarding?.completedSteps || []);

  const patchForm = (patch) => setForm((current) => ({ ...current, ...patch }));
  const toggleListValue = (key, value) => {
    setForm((current) => {
      const values = new Set(current[key] || []);
      if (values.has(value)) values.delete(value);
      else values.add(value);
      return { ...current, [key]: [...values] };
    });
  };

  async function saveProgress(nextStep, patch = {}) {
    const nextCompleted = [...new Set([...(onboarding?.completedSteps || []), step])].sort((a, b) => a - b);
    await update.mutateAsync({
      currentStep: nextStep,
      completedSteps: nextCompleted,
      selectedProviders: form.selectedProviders,
      ...patch,
    });
    setStep(nextStep);
  }

  async function handleConnect() {
    setBusyAction('connect');
    try {
      await update.mutateAsync({
        status: 'provider_selected',
        currentStep: 2,
        completedSteps: [...new Set([...(onboarding?.completedSteps || []), 0, 1])],
        selectedProviders: form.selectedProviders,
        provider: selectedProvider,
        eventType: 'provider_selected',
      });
      const returnTo = `${window.location.origin}${paths.setup}`;
      const result = await startReviewIntegrationOAuth(selectedProvider, { returnTo });
      window.location.assign(result.authorizationUrl);
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || 'Unable to start provider connection.');
      setBusyAction('');
    }
  }

  async function handleLocationContinue() {
    const options = connection.discoveredLocations || [];
    const selected = options.filter((item) => form.locationIds.includes(item.locationId));
    if (selectedProvider === 'google' && options.length > 1 && !selected.length) {
      toast.error('Select at least one business location.');
      return;
    }
    const effective = selected.length ? selected : options.slice(0, 1);
    await saveProgress(4, {
      status: 'location_selected',
      provider: selectedProvider,
      eventType: 'location_selected',
      locationSelection: {
        provider: selectedProvider,
        accountId: effective[0]?.accountId || connection.accountId || null,
        accountLabel: effective[0]?.accountLabel || connection.accountLabel || null,
        locationIds: effective.map((item) => item.locationId).filter(Boolean),
        locationLabels: effective.map((item) => item.locationLabel).filter(Boolean),
        confirmed: true,
      },
    });
  }

  async function handleValidate() {
    setBusyAction('validate');
    try {
      const result = await validateReviewIntegrationOAuth(selectedProvider);
      if (!result.success) throw new Error(result.message || 'Provider validation needs attention.');
      toast.success(result.message || 'Connection validated.');
      await saveProgress(5, {
        status: 'connection_validated',
        provider: selectedProvider,
        eventType: 'connection_validated',
      });
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.response?.data?.error || error.message);
      await update.mutateAsync({
        status: 'needs_attention',
        currentStep: 4,
        provider: selectedProvider,
        eventType: 'validation_failed',
        lastError: error?.response?.data?.message || error.message,
      }).catch(() => null);
    } finally {
      setBusyAction('');
    }
  }

  async function handleFirstImport() {
    setBusyAction('sync');
    try {
      await update.mutateAsync({ status: 'initial_sync_started', currentStep: 5, provider: selectedProvider, eventType: 'initial_sync_started' });
      const result = await syncReviewIntegration(selectedProvider);
      toast.success(`Imported ${result.reviewsFetched || 0} review${result.reviewsFetched === 1 ? '' : 's'}.`);
      await saveProgress(6, { status: 'initial_sync_complete', provider: selectedProvider, eventType: 'initial_sync_complete' });
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || 'Initial review import failed.');
    } finally {
      setBusyAction('');
    }
  }

  async function handleFinish() {
    try {
      await saveProgress(12, {
        status: 'complete',
        eventType: 'completed',
        alertPreferences: { enabled: true, channels: form.alertChannels, events: form.alertEvents },
        responsePolicy: form.responsePolicy,
        approvers: form.approvers,
        feedback: form.feedback,
      });
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.response?.data?.error || error.message || 'Review setup is not ready.');
    }
  }

  if (query.isLoading) {
    return <div className="p-8 text-sm text-slate-600">Loading review setup…</div>;
  }
  if (query.error) {
    return <div className="m-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{query.error?.response?.data?.error || 'Unable to load review setup.'}</div>;
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">Review Feedback Setup</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Connect reviews with confidence</h1>
          <p className="mt-2 text-sm text-slate-600">Progress is saved automatically. You can leave and resume at any time.</p>
        </div>
        <Link to={paths.integrations} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Advanced settings</Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="font-semibold text-slate-800">Step {step + 1} of {STEPS.length}: {STEPS[step]}</span>
          <span className="text-slate-500">{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>
      </div>

      {step === 0 ? (
        <StepShell title="Let’s set up review monitoring" description="Merxus can bring new reviews into one workspace, alert your team when attention is needed, and draft a response for a person to approve.">
          <div className="grid gap-3 sm:grid-cols-3">
            {['Monitor new reviews', 'Alert the right people', 'Draft human-approved replies'].map((item) => <div key={item} className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">{item}</div>)}
          </div>
        </StepShell>
      ) : null}

      {step === 1 ? (
        <StepShell title="Choose your review source" description="Google is the first live rollout. Other providers appear only when their credentials and monitoring capability are ready.">
          <div className="space-y-3">
            {availableProviders.map((provider) => {
              const capability = capabilities[provider] || {};
              const disabled = !capability.connectionEnabled;
              return <CheckOption key={provider} checked={form.selectedProviders.includes(provider)} disabled={disabled} onChange={() => patchForm({ selectedProviders: [provider] })} title={PROVIDER_LABELS[provider]} description={disabled ? capability.disabledReason : capability.monitoringEnabled ? 'Connection and monitoring are available.' : 'Connection is available; monitoring is awaiting rollout.'} />;
            })}
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600"><span className="font-semibold">Yelp:</span> planned as a separate future integration.</div>
          </div>
        </StepShell>
      ) : null}

      {step === 2 ? (
        <StepShell title={`Connect ${PROVIDER_LABELS[selectedProvider] || selectedProvider}`} description="You’ll sign in with the provider and choose an account you are authorized to manage. Merxus never asks for your provider password.">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="font-semibold text-slate-900">{connection.connected ? 'Account connected' : 'Ready to connect'}</p>
            <p className="mt-2 text-sm text-slate-600">{connection.connected ? connection.accountLabel || 'Connected provider account' : capabilities[selectedProvider]?.disabledReason || 'Continue to the provider’s secure sign-in page.'}</p>
            {!connection.connected ? <button type="button" onClick={handleConnect} disabled={busyAction === 'connect' || !capabilities[selectedProvider]?.connectionEnabled} className="mt-4 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busyAction === 'connect' ? 'Opening…' : `Connect ${PROVIDER_LABELS[selectedProvider]}`}</button> : null}
          </div>
        </StepShell>
      ) : null}

      {step === 3 ? (
        <StepShell title="Confirm the right business location" description="This prevents reviews from the wrong brand or location from entering your workspace.">
          <div className="space-y-3">
            {(connection.discoveredLocations || []).length ? connection.discoveredLocations.map((location) => <CheckOption key={location.locationId} checked={form.locationIds.includes(location.locationId) || ((connection.discoveredLocations || []).length === 1 && !form.locationIds.length)} onChange={() => toggleListValue('locationIds', location.locationId)} title={location.locationLabel} description={[location.accountLabel, location.address].filter(Boolean).join(' • ')} />) : <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">{connection.accountLabel || 'Connected account'} has {connection.totalLocations || 1} available location.</div>}
          </div>
        </StepShell>
      ) : null}

      {step === 4 ? (
        <StepShell title="Validate the connection" description="Merxus will check the account, scopes, token health, and selected location before importing reviews.">
          <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-700"><p><span className="font-semibold">Account:</span> {connection.accountLabel || 'Connected account'}</p><p className="mt-2"><span className="font-semibold">Connection confidence:</span> {String(integration?.connectionConfidence || 'connected_unverified').replaceAll('_', ' ')}</p></div>
        </StepShell>
      ) : null}

      {step === 5 ? (
        <StepShell title="Run the first review import" description="You’ll see the actual import result before monitoring is considered ready.">
          {integration?.syncSummary ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[['Fetched', integration.syncSummary.reviewsFetched], ['Average', integration.syncSummary.averageRating ?? '—'], ['Positive', integration.syncSummary.positiveCount], ['Neutral', integration.syncSummary.neutralCount], ['Needs attention', integration.syncSummary.needsAttentionCount]].map(([label, value]) => <div key={label} className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value ?? 0}</p></div>)}</div> : <p className="text-sm text-slate-600">No import has run yet.</p>}
        </StepShell>
      ) : null}

      {step === 6 ? (
        <StepShell title="Choose review alerts" description="Select what matters and where Merxus should notify the team.">
          <div className="grid gap-6 sm:grid-cols-2"><div className="space-y-3"><p className="font-semibold text-slate-900">Events</p>{[['negative_review', 'New negative review'], ['review_spike', 'Negative-review spike'], ['review_sync_failed', 'Provider sync failure']].map(([value, label]) => <CheckOption key={value} checked={form.alertEvents.includes(value)} onChange={() => toggleListValue('alertEvents', value)} title={label} />)}</div><div className="space-y-3"><p className="font-semibold text-slate-900">Channels</p>{[['web', 'In-app'], ['email', 'Email'], ['push', 'Mobile push'], ['sms', 'SMS']].map(([value, label]) => <CheckOption key={value} checked={form.alertChannels.includes(value)} onChange={() => toggleListValue('alertChannels', value)} title={label} description={value === 'sms' ? 'Requires a phone number on the selected approver.' : ''} />)}</div></div>
          <button type="button" onClick={() => testNotification.mutate(form.alertChannels)} disabled={testNotification.isPending} className="mt-5 rounded-full border border-emerald-600 px-5 py-2.5 text-sm font-bold text-emerald-700 disabled:opacity-50">{testNotification.isPending ? 'Sending…' : 'Send test notification'}</button>
          <p className="mt-3 text-xs text-slate-500">Verified channels: {onboarding?.alertVerification?.verifiedChannels?.join(', ') || 'none yet'}. At least one selected channel must pass before setup can be completed.</p>
        </StepShell>
      ) : null}

      {step === 7 ? (
        <StepShell title="Set your response style" description="Merxus uses this reusable policy whenever it drafts a public response.">
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">Tone<select value={form.responsePolicy.tone || 'warm_professional'} onChange={(event) => patchForm({ responsePolicy: { ...form.responsePolicy, tone: event.target.value } })} className="input-field mt-2"><option value="warm_professional">Warm and professional</option><option value="friendly">Friendly</option><option value="formal">Formal</option><option value="direct">Direct and accountable</option></select></label><label className="text-sm font-medium text-slate-700">Length<select value={form.responsePolicy.length || 'concise'} onChange={(event) => patchForm({ responsePolicy: { ...form.responsePolicy, length: event.target.value } })} className="input-field mt-2"><option value="concise">Concise</option><option value="standard">Standard</option><option value="detailed">Detailed</option></select></label><label className="text-sm font-medium text-slate-700">Language<select value={form.responsePolicy.language || 'match_reviewer'} onChange={(event) => patchForm({ responsePolicy: { ...form.responsePolicy, language: event.target.value } })} className="input-field mt-2"><option value="match_reviewer">Match reviewer language</option><option value="english">English</option><option value="spanish">Spanish</option></select></label><label className="text-sm font-medium text-slate-700">Optional signoff<input value={form.responsePolicy.signoff || ''} onChange={(event) => patchForm({ responsePolicy: { ...form.responsePolicy, signoff: event.target.value } })} className="input-field mt-2" placeholder="— The Merxus Team" /></label></div>
        </StepShell>
      ) : null}

      {step === 8 ? (
        <StepShell title="A person stays in control" description="Merxus drafts responses; an authorized person reviews and approves them. For the current rollout, your team posts the approved reply on the provider. A later sync verifies whether the provider shows it publicly.">
          <div className="space-y-3 text-sm text-slate-700"><p className="rounded-2xl bg-emerald-50 p-4"><strong>Approved</strong> means your team approved the wording.</p><p className="rounded-2xl bg-amber-50 p-4"><strong>Reported posted</strong> means a user says they posted it; provider verification is still pending.</p><p className="rounded-2xl bg-sky-50 p-4"><strong>Verified posted</strong> means Google or Trustpilot confirms the public reply exists.</p></div>
        </StepShell>
      ) : null}

      {step === 9 ? (
        <StepShell title="Choose who can approve responses" description="Only these people can approve a draft or report it posted once this list is configured.">
          <div className="space-y-3">{form.approvers.map((approver, index) => <div key={`${approver.uid || approver.email}-${index}`} className="grid gap-3 rounded-2xl border border-slate-200 p-4 sm:grid-cols-3"><input className="input-field" value={approver.name || ''} onChange={(event) => patchForm({ approvers: form.approvers.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) })} placeholder="Name" /><input className="input-field" value={approver.email || ''} onChange={(event) => patchForm({ approvers: form.approvers.map((item, itemIndex) => itemIndex === index ? { ...item, email: event.target.value } : item) })} placeholder="Email" type="email" /><input className="input-field" value={approver.phone || ''} onChange={(event) => patchForm({ approvers: form.approvers.map((item, itemIndex) => itemIndex === index ? { ...item, phone: event.target.value } : item) })} placeholder="Phone (optional)" /></div>)}</div>
          <button type="button" onClick={() => patchForm({ approvers: [...form.approvers, { uid: null, email: '', name: '', role: 'staff', phone: '' }] })} className="mt-4 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold">Add approver</button>
        </StepShell>
      ) : null}

      {step === 10 ? (
        <StepShell title="Optional private feedback" description="After an eligible interaction, Merxus can ask the customer privately for feedback. Positive respondents can be invited to a public review; low ratings stay in your recovery queue.">
          <div className="space-y-3"><CheckOption checked={form.feedback.enabled === true} onChange={() => patchForm({ feedback: { ...form.feedback, enabled: !form.feedback.enabled } })} title="Enable the private feedback funnel" description="You can change message templates later in Advanced settings." />{form.feedback.enabled ? <><CheckOption checked={form.feedback.triggerOnPostCall !== false} onChange={() => patchForm({ feedback: { ...form.feedback, triggerOnPostCall: !form.feedback.triggerOnPostCall } })} title="Request feedback after eligible calls" /><CheckOption checked={form.feedback.triggerOnInboundSms === true} onChange={() => patchForm({ feedback: { ...form.feedback, triggerOnInboundSms: !form.feedback.triggerOnInboundSms } })} title="Request feedback after eligible SMS conversations" /></> : null}</div>
        </StepShell>
      ) : null}

      {step === 11 ? (
        <StepShell title="Review your setup" description="Confirm the essentials. You can return to any earlier step or adjust advanced settings later.">
          <dl className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase text-slate-500">Provider</dt><dd className="mt-1 font-semibold">{PROVIDER_LABELS[selectedProvider]}</dd></div><div className="rounded-2xl bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase text-slate-500">Connection</dt><dd className="mt-1 font-semibold">{integration?.connectionConfidence?.replaceAll('_', ' ') || 'connected'}</dd></div><div className="rounded-2xl bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase text-slate-500">Alerts</dt><dd className="mt-1 font-semibold">{form.alertChannels.join(', ') || 'None'}</dd></div><div className="rounded-2xl bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase text-slate-500">Approvers</dt><dd className="mt-1 font-semibold">{form.approvers.length}</dd></div><div className="rounded-2xl bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase text-slate-500">Response policy</dt><dd className="mt-1 font-semibold">{String(form.responsePolicy.tone || '').replaceAll('_', ' ')}</dd></div><div className="rounded-2xl bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase text-slate-500">Private feedback</dt><dd className="mt-1 font-semibold">{form.feedback.enabled ? 'Enabled' : 'Not enabled'}</dd></div></dl>
        </StepShell>
      ) : null}

      {step === 12 ? (
        <StepShell title="Merxus is watching your reviews" description="Merxus will monitor the selected source, surface review alerts, and prepare drafts for your approved team members.">
          <div className="flex flex-wrap gap-3"><Link to={paths.reviews} className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white">View my reviews</Link><Link to={paths.reviews} className="rounded-full border border-emerald-600 px-5 py-2.5 text-sm font-bold text-emerald-700">Generate a sample response</Link><Link to={paths.feedback} className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700">View feedback</Link><Link to={paths.integrations} className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700">Review settings</Link></div>
        </StepShell>
      ) : null}

      {step < 12 ? (
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0 || update.isPending} className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-40">Back</button>
          {step === 2 && !connection.connected ? <span className="text-sm text-slate-500">Connect the provider to continue.</span> : step === 4 ? <span /> : step === 5 ? <span /> : (
            <button type="button" disabled={update.isPending || (step === 1 && !form.selectedProviders.length) || (step === 2 && !connection.connected)} onClick={() => {
              if (step === 3) return handleLocationContinue();
              if (step === 6) return saveProgress(7, { status: 'alerts_configured', eventType: 'alerts_configured', alertPreferences: { enabled: true, channels: form.alertChannels, events: form.alertEvents } });
              if (step === 7) return saveProgress(8, { status: 'response_policy_configured', eventType: 'response_policy_configured', responsePolicy: form.responsePolicy });
              if (step === 8) return saveProgress(9, { status: 'response_policy_configured', eventType: 'approval_workflow_acknowledged' });
              if (step === 9) return saveProgress(10, { status: 'approvers_configured', eventType: 'approvers_configured', approvers: form.approvers });
              if (step === 10) return saveProgress(11, { status: 'feedback_configured', eventType: 'feedback_configured', feedback: form.feedback });
              if (step === 11) return handleFinish();
              return saveProgress(step + 1, { status: step === 0 ? 'not_started' : 'provider_selected', eventType: 'step_completed' });
            }} className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50">{update.isPending ? 'Saving…' : step === 11 ? 'Finish setup' : 'Continue'}</button>
          )}
        </div>
      ) : null}

      {step === 4 ? <div className="flex justify-end"><button type="button" onClick={handleValidate} disabled={busyAction === 'validate'} className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busyAction === 'validate' ? 'Validating…' : 'Validate and continue'}</button></div> : null}
      {step === 5 ? <div className="flex justify-end"><button type="button" onClick={handleFirstImport} disabled={busyAction === 'sync' || !capabilities[selectedProvider]?.monitoringEnabled} className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busyAction === 'sync' ? 'Importing…' : 'Import and continue'}</button></div> : null}
      {completedSteps.size > 0 && step < 12 ? <p className="text-center text-xs text-slate-500">Saved progress: {completedSteps.size} step{completedSteps.size === 1 ? '' : 's'} completed.</p> : null}
    </section>
  );
}
