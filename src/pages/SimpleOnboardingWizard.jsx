import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import TurnstileWidget from "../components/common/TurnstileWidget";
import { createCheckoutSession, getBillingPricing, reserveNumber } from "../api/billing";
import { searchAvailableNumbers } from "../api/twilioProvisioning";
import {
  createProvisionalTenant,
  getVerificationStatus,
  sendVerificationLink,
} from "../api/instagramOnboarding";

const INDUSTRY_OPTIONS = [
  { value: "voice", label: "Office" },
  { value: "real_estate", label: "Real Estate" },
  { value: "restaurant", label: "Restaurant" },
];

function formatMoney(amount, currency = "usd") {
  if (amount === null || amount === undefined) return "n/a";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  } catch {
    return `$${(amount / 100).toFixed(2)}`;
  }
}

export default function SimpleOnboardingWizard() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, loading } = useAuth();

  const initialType = params.get("type") || "voice";
  const verifiedFromRedirect = params.get("verified") === "1";
  const tenantFromRedirect = params.get("tenantId") || "";

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [tenantId, setTenantId] = useState(tenantFromRedirect);
  const [reservationId, setReservationId] = useState("");
  const [emailVerified, setEmailVerified] = useState(verifiedFromRedirect);
  const [searching, setSearching] = useState(false);
  const [numbers, setNumbers] = useState([]);
  const [pricing, setPricing] = useState(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const [form, setForm] = useState({
    tenantType: initialType,
    businessName: "",
    contactName: "",
    email: user?.email || "",
    mobilePhone: "",
    areaCode: "",
    selectedNumber: "",
  });

  const pricingKey = form.tenantType === "voice" ? "office" : form.tenantType;
  const tenantPricing = pricing?.tenants?.[pricingKey] || null;

  useEffect(() => {
    if (verifiedFromRedirect) {
      setStep(2);
    }
  }, [verifiedFromRedirect]);

  useEffect(() => {
    if (!user?.email) return;
    setForm((prev) => ({ ...prev, email: prev.email || user.email }));
  }, [user?.email]);

  useEffect(() => {
    const loadPricing = async () => {
      try {
        const data = await getBillingPricing();
        setPricing(data);
      } catch (error) {
        console.error("Pricing load failed:", error);
      }
    };
    loadPricing();
  }, []);

  const steps = useMemo(
    () => [
      "Business Info + Email Verification",
      "Number Reservation",
      "Review Pricing",
      "Checkout",
    ],
    []
  );

  const setupReturnPath = `/setup?type=${encodeURIComponent(form.tenantType)}`;
  const onboardingSignupPath = `/onboarding?type=${encodeURIComponent(form.tenantType)}&plan=basic&source=ig`;

  const handleAlreadyUser = () => {
    const loginPath = `/login?type=${encodeURIComponent(form.tenantType)}&returnTo=${encodeURIComponent(setupReturnPath)}`;
    navigate(loginPath, {
      replace: false,
      state: { returnTo: setupReturnPath, tenantType: form.tenantType, source: "ig" },
    });
  };

  const handleGetStarted = () => {
    navigate(onboardingSignupPath, { replace: false });
  };

  const handleSendVerification = async () => {
    if (!form.businessName.trim() || !form.contactName.trim() || !form.email.trim()) {
      toast.error("Business name, contact name, and email are required.");
      return;
    }
    if (!user) {
      toast.error("Please sign in first.");
      return;
    }

    setSubmitting(true);
    try {
      let effectiveTenantId = tenantId;
      if (!effectiveTenantId) {
        const createResult = await createProvisionalTenant({
          tenantType: form.tenantType,
          businessName: form.businessName.trim(),
          contactName: form.contactName.trim(),
          email: form.email.trim(),
          mobilePhone: form.mobilePhone.trim(),
        });
        effectiveTenantId = createResult.tenantId;
        setTenantId(effectiveTenantId);
      }

      await sendVerificationLink({ tenantId: effectiveTenantId });
      toast.success("Verification link sent. Check your email.");
    } catch (error) {
      console.error("Failed to send verification link:", error);
      toast.error(error.response?.data?.error || "Failed to send verification link.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefreshVerification = async () => {
    if (!tenantId) {
      toast.error("Create provisional tenant first.");
      return;
    }

    setSubmitting(true);
    try {
      const status = await getVerificationStatus(tenantId);
      if (status.emailVerified) {
        setEmailVerified(true);
        setStep(2);
        toast.success("Email verified. Continue to number reservation.");
        return;
      }
      toast.info("Email not verified yet. Open your link and try again.");
    } catch (error) {
      console.error("Verification status failed:", error);
      toast.error(error.response?.data?.error || "Unable to check verification status.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearchNumbers = async () => {
    if (!form.areaCode || form.areaCode.length !== 3) {
      toast.error("Enter a valid 3-digit area code.");
      return;
    }
    setSearching(true);
    try {
      const result = await searchAvailableNumbers(form.areaCode, tenantId);
      const found = result.numbers || [];
      setNumbers(found);
      if (!found.length) {
        toast.info("No available numbers in that area code.");
      }
    } catch (error) {
      console.error("Number search failed:", error);
      toast.error(error.response?.data?.error || "Failed to search numbers.");
    } finally {
      setSearching(false);
    }
  };

  const handleReserveNumber = async (phoneNumber) => {
    if (!tenantId) {
      toast.error("Email verification step must be completed first.");
      return;
    }
    if (!captchaToken) {
      toast.error("Complete CAPTCHA before reserving a number.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await reserveNumber({
        tenantType: form.tenantType,
        tenantId,
        selectedNumber: phoneNumber,
        captchaToken,
      });
      setReservationId(result.reservationId);
      setForm((prev) => ({ ...prev, selectedNumber: phoneNumber }));
      setStep(3);
      toast.success("Number reserved for checkout.");
    } catch (error) {
      console.error("Number reserve failed:", error);
      toast.error(error.response?.data?.error || "Failed to reserve number.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartCheckout = async () => {
    if (!tenantId || !reservationId) {
      toast.error("Reserve a number first.");
      return;
    }

    setSubmitting(true);
    try {
      const origin = window.location.origin;
      const successUrl = `${origin}/payment-success`;
      const cancelUrl = `${origin}/setup?tenantId=${encodeURIComponent(tenantId)}`;
      const result = await createCheckoutSession({
        tenantType: form.tenantType,
        tenantId,
        reservationId,
        successUrl,
        cancelUrl,
      });
      window.location.href = result.url;
    } catch (error) {
      console.error("Checkout init failed:", error);
      toast.error(error.response?.data?.error || "Failed to start checkout.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!loading && !user) {
    return (
      <div className="mx-auto mt-12 max-w-xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Get Started with Setup</h1>
        <p className="mt-2 text-sm text-gray-600">
          Continue as a new customer or sign in if you already have an account.
        </p>
        <p className="mt-2 text-xs text-gray-500">Selected tenant: {form.tenantType}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleGetStarted}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Get Started
          </button>
          <button
            type="button"
            onClick={handleAlreadyUser}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900"
          >
            Already a User?
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900">Simple Setup Wizard</h1>
      <p className="mt-2 text-sm text-gray-600">4 steps to go live from Instagram traffic.</p>

      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {steps.map((label, index) => (
          <div
            key={label}
            className={`rounded-lg border px-3 py-2 text-xs ${
              index + 1 === step ? "border-green-500 bg-green-50" : "border-gray-200 bg-white"
            }`}
          >
            {index + 1}. {label}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">Business Info + Email Verification</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <select
              value={form.tenantType}
              onChange={(e) => setForm((prev) => ({ ...prev, tenantType: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {INDUSTRY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              value={form.businessName}
              onChange={(e) => setForm((prev) => ({ ...prev, businessName: e.target.value }))}
              placeholder="Business Name"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              value={form.contactName}
              onChange={(e) => setForm((prev) => ({ ...prev, contactName: e.target.value }))}
              placeholder="Contact Name"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Email"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              value={form.mobilePhone}
              onChange={(e) => setForm((prev) => ({ ...prev, mobilePhone: e.target.value }))}
              placeholder="Mobile Phone"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-2"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSendVerification}
              disabled={submitting}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-gray-300"
            >
              {submitting ? "Sending..." : "Send Verification Link"}
            </button>
            <button
              type="button"
              onClick={handleRefreshVerification}
              disabled={submitting || !tenantId}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 disabled:opacity-60"
            >
              Refresh Verification Status
            </button>
          </div>
          <p className="mt-3 text-sm text-gray-600">
            Tenant: {tenantId || "not created"} | Email verified: {emailVerified ? "yes" : "no"}
          </p>
        </div>
      )}

      {step === 2 && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">Number Search + Reservation</h2>
          <div className="mt-4 flex gap-2">
            <input
              value={form.areaCode}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, areaCode: e.target.value.replace(/\D/g, "").slice(0, 3) }))
              }
              placeholder="Area code (e.g. 310)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleSearchNumbers}
              disabled={searching}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </div>

          <div className="mt-4 rounded-lg border border-gray-200 p-3">
            <TurnstileWidget onVerify={setCaptchaToken} onExpire={() => setCaptchaToken("")} />
          </div>

          <div className="mt-4 space-y-2">
            {numbers.map((item) => (
              <div
                key={item.phoneNumber}
                className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2"
              >
                <div className="text-sm text-gray-900">{item.phoneNumber}</div>
                <button
                  type="button"
                  onClick={() => handleReserveNumber(item.phoneNumber)}
                  disabled={submitting}
                  className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Reserve
                </button>
              </div>
            ))}
            {!numbers.length && <p className="text-sm text-gray-500">No numbers loaded yet.</p>}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">Review & Pricing Confirmation</h2>
          <p className="mt-3 text-sm text-gray-700">Selected number: {form.selectedNumber || "none"}</p>
          <p className="mt-1 text-sm text-gray-700">
            Onboarding fee: {formatMoney(tenantPricing?.onboarding?.unitAmount, tenantPricing?.onboarding?.currency)}
          </p>
          <p className="mt-1 text-sm text-gray-700">
            Monthly subscription:{" "}
            {formatMoney(tenantPricing?.subscription?.unitAmount, tenantPricing?.subscription?.currency)}
          </p>
          <button
            type="button"
            onClick={() => setStep(4)}
            className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Continue to Checkout
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">Stripe Checkout</h2>
          <p className="mt-2 text-sm text-gray-600">
            Checkout uses server-side pricing and tenant metadata. You will be redirected to Stripe.
          </p>
          <button
            type="button"
            onClick={handleStartCheckout}
            disabled={submitting}
            className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-gray-300"
          >
            {submitting ? "Redirecting..." : "Proceed to Secure Checkout"}
          </button>
        </div>
      )}
    </div>
  );
}
