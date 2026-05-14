import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, CreditCard, Loader2, PhoneCall } from 'lucide-react';
import { toast } from 'react-toastify';
import PaymentCheckout from '../components/onboarding/steps/PaymentCheckout';
import TwilioSetup from '../components/onboarding/steps/TwilioSetup';
import { completeTenantActivation, getTenantActivationStatus } from '../api/billing';
import { useAuth } from '../context/AuthContext';
import { formatPhoneDisplay } from '../utils/phoneFormatter';

function getDashboardPath(tenantType) {
  if (tenantType === 'restaurant') return '/restaurant/dashboard';
  if (tenantType === 'voice') return '/voice/dashboard';
  if (tenantType === 'real_estate') return '/estate/dashboard';
  return '/';
}

function StepStatus({ complete }) {
  return complete ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
      <CheckCircle2 size={14} /> Complete
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
      Required
    </span>
  );
}

export default function TenantActivationPage() {
  const navigate = useNavigate();
  const { userClaims, refreshToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [activationData, setActivationData] = useState({
    paymentCompleted: false,
    twilioPhoneNumber: '',
    twilioPhoneSid: '',
    twilioAccountSid: '',
    twilioAuthToken: '',
  });

  const tenantType = status?.tenantType || userClaims?.type || '';
  const tenantId = status?.tenantId || userClaims?.tenantId || userClaims?.restaurantId || userClaims?.officeId || userClaims?.agentId || '';

  const isBillingComplete = Boolean(status?.billing?.complete || activationData.paymentCompleted);
  const isPhoneComplete = Boolean(status?.phone?.complete || activationData.twilioPhoneNumber);
  const isComplete = isBillingComplete && isPhoneComplete;

  const businessName = useMemo(() => {
    return status?.businessName || 'your Merxus AI assistant';
  }, [status?.businessName]);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const result = await getTenantActivationStatus();
      setStatus(result);
      setActivationData((current) => ({
        ...current,
        businessName: result.businessName || current.businessName || '',
        paymentCompleted: Boolean(result.billing?.complete || current.paymentCompleted),
        twilioPhoneNumber: result.phone?.twilioPhoneNumber || current.twilioPhoneNumber || '',
        twilioPhoneSid: result.phone?.twilioPhoneSid || current.twilioPhoneSid || '',
        twilioAccountSid: result.phone?.twilioPhoneNumber ? 'auto_provisioned' : current.twilioAccountSid || '',
        twilioAuthToken: result.phone?.twilioPhoneNumber ? 'auto_provisioned' : current.twilioAuthToken || '',
      }));

      if (result.activationRequired === false || result.activationComplete === true) {
        navigate(getDashboardPath(result.tenantType), { replace: true });
      }
    } catch (error) {
      console.error('Failed to load activation status:', error);
      toast.error(error?.response?.data?.error || 'Failed to load activation status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const updateActivationData = (patch) => {
    setActivationData((current) => ({ ...current, ...patch }));
  };

  const finishActivation = async () => {
    if (!isComplete) {
      toast.error('Complete billing and phone number setup first.');
      return;
    }

    setSaving(true);
    try {
      const result = await completeTenantActivation();
      await refreshToken();
      toast.success('Activation complete. Welcome aboard.');
      navigate(getDashboardPath(result.tenantType || tenantType), { replace: true });
    } catch (error) {
      console.error('Failed to complete activation:', error);
      toast.error(error?.response?.data?.message || error?.response?.data?.error || 'Activation is not complete yet.');
      await loadStatus();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-300">
          <Loader2 className="animate-spin" size={20} />
          Loading activation...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
        <header className="border-b border-slate-800 pb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-green-300">Tenant activation</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Finish setup for {businessName}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Complete billing, assign the AI phone number, then activate the workspace.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CreditCard className="mb-3 text-green-300" size={24} />
                <h2 className="text-lg font-semibold text-white">Billing</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {isBillingComplete ? 'Payment is connected.' : 'Connect Stripe checkout for this tenant.'}
                </p>
              </div>
              <StepStatus complete={isBillingComplete} />
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <PhoneCall className="mb-3 text-green-300" size={24} />
                <h2 className="text-lg font-semibold text-white">AI Phone</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {isPhoneComplete
                    ? `Assigned ${formatPhoneDisplay(activationData.twilioPhoneNumber || status?.phone?.twilioPhoneNumber)}.`
                    : 'Select or assign the live AI phone number.'}
                </p>
              </div>
              <StepStatus complete={isPhoneComplete} />
            </div>
          </div>
        </section>

        {!isBillingComplete ? (
          <section className="rounded-lg border border-slate-800 bg-white text-slate-950">
            <PaymentCheckout
              data={activationData}
              onChange={updateActivationData}
              tenantType={tenantType}
              tenantId={tenantId}
            />
          </section>
        ) : null}

        {isBillingComplete && !isPhoneComplete ? (
          <section className="rounded-lg border border-slate-800 bg-white text-slate-950">
            <TwilioSetup
              data={{ ...activationData, paymentCompleted: true }}
              onChange={updateActivationData}
              tenantType={tenantType}
              tenantId={tenantId}
            />
          </section>
        ) : null}

        <div className="flex items-center justify-between gap-4 border-t border-slate-800 pt-6">
          <button
            type="button"
            onClick={loadStatus}
            className="rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500"
          >
            Refresh Status
          </button>
          <button
            type="button"
            onClick={finishActivation}
            disabled={!isComplete || saving}
            className="rounded-md bg-green-500 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-green-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {saving ? 'Activating...' : 'Activate Workspace'}
          </button>
        </div>
      </main>
    </div>
  );
}
