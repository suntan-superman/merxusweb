import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { finalizeProvisioning, verifyCheckoutSession, verifyTestCallReadiness } from "../api/billing";
import { useAuth } from "../context/AuthContext";

function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(ua);
}

function toTelNumber(phoneNumber) {
  const raw = String(phoneNumber || "").trim();
  if (!raw) return "";
  if (raw.startsWith("+")) {
    return `+${raw.slice(1).replace(/\D/g, "")}`;
  }
  return raw.replace(/\D/g, "");
}

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, loading } = useAuth();
  const mobileDevice = isMobileDevice();
  const iosAppStoreUrl =
    import.meta.env.VITE_IOS_APP_STORE_URL || "https://apps.apple.com/us/iphone/search?term=merxus";
  const sessionId = params.get("session_id");
  const tenantTypeFromParams = params.get("type") || "voice";
  const tenantIdFromParams = params.get("tenantId") || "";
  const [state, setState] = useState({
    loading: true,
    error: "",
    result: null,
  });
  const [provisioning, setProvisioning] = useState({
    loading: false,
    error: "",
    result: null,
  });
  const [testCall, setTestCall] = useState({
    loading: false,
    error: "",
    result: null,
  });

  const getPostPaymentRoute = () => {
    const tenantType = state.result?.tenantType || tenantTypeFromParams;
    if (tenantType === "restaurant") return "/restaurant";
    if (tenantType === "real_estate") return "/estate";
    return "/voice";
  };

  const handleFinalizeProvisioning = useCallback(async () => {
    if (!sessionId) return;

    setProvisioning({ loading: true, error: "", result: null });
    try {
      const result = await finalizeProvisioning(sessionId);
      setProvisioning({ loading: false, error: "", result });
    } catch (error) {
      setProvisioning({
        loading: false,
        error: error.response?.data?.error || "Failed to provision your Twilio number.",
        result: null,
      });
    }
  }, [sessionId]);

  const handleVerifyTestCall = useCallback(async () => {
    const phoneNumber =
      provisioning.result?.phoneNumber ||
      state.result?.twilioPhoneNumber ||
      state.result?.selectedNumber ||
      "";
    const tenantType = state.result?.tenantType || tenantTypeFromParams;

    if (!phoneNumber) {
      setTestCall({
        loading: false,
        error: "No phone number available yet. Complete provisioning first.",
        result: null,
      });
      return;
    }

    setTestCall({ loading: true, error: "", result: null });
    try {
      const result = await verifyTestCallReadiness({ phoneNumber, tenantType });
      setTestCall({ loading: false, error: "", result });

      if (mobileDevice) {
        const telNumber = toTelNumber(result?.phoneNumber || phoneNumber);
        if (telNumber) {
          window.location.href = `tel:${telNumber}`;
        }
      }
    } catch (error) {
      setTestCall({
        loading: false,
        error: error.response?.data?.error || "Failed to verify test call readiness.",
        result: null,
      });
    }
  }, [mobileDevice, provisioning.result, state.result, tenantTypeFromParams]);

  useEffect(() => {
    const run = async () => {
      if (!sessionId) {
        setState({ loading: false, error: "Missing session_id in URL.", result: null });
        return;
      }
      try {
        const result = await verifyCheckoutSession(sessionId);
        setState({ loading: false, error: "", result });
      } catch (error) {
        setState({
          loading: false,
          error: error.response?.data?.error || "Failed to verify checkout session.",
          result: null,
        });
      }
    };

    if (!loading && user) {
      run();
    }
  }, [loading, sessionId, user]);

  useEffect(() => {
    if (
      state.loading ||
      !state.result ||
      !state.result.paid ||
      !state.result.reservationId ||
      provisioning.loading ||
      provisioning.result ||
      provisioning.error
    ) {
      return;
    }
    handleFinalizeProvisioning();
  }, [handleFinalizeProvisioning, provisioning.error, provisioning.loading, provisioning.result, state.loading, state.result]);

  if (!loading && !user) {
    return (
      <div className="mx-auto mt-12 max-w-xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Sign in required</h1>
        <p className="mt-2 text-sm text-gray-600">
          Payment verification requires the same authenticated Firebase account used to checkout.
        </p>
        <button
          type="button"
          onClick={() => navigate("/login", { state: { returnTo: window.location.pathname + window.location.search } })}
          className="mt-6 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-10 max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-gray-900">Payment Success</h1>
      {state.loading && <p className="mt-3 text-sm text-gray-600">Verifying your checkout session...</p>}
      {!state.loading && state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
      {!state.loading && state.result && (
        <div className="mt-4 space-y-2 text-sm text-gray-700">
          <p>Paid: {state.result.paid ? "yes" : "no"}</p>
          <p>Session status: {state.result.status || "n/a"}</p>
          <p>Payment status: {state.result.paymentStatus || "n/a"}</p>
          <p>Tenant ID: {state.result.tenantId || "n/a"}</p>
          <p>Tenant type: {state.result.tenantType || "n/a"}</p>
          <p>Reserved number: {state.result.selectedNumber || "n/a"}</p>
          <p>Subscription status: {state.result.subscriptionStatus || "n/a"}</p>

          {state.result.paid && state.result.reservationId && (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="font-semibold text-gray-900">Number Provisioning</p>
              {provisioning.loading && <p className="mt-2 text-sm text-gray-600">Assigning your Twilio number...</p>}
              {!provisioning.loading && provisioning.error && (
                <div className="mt-2">
                  <p className="text-sm text-red-600">{provisioning.error}</p>
                  <button
                    type="button"
                    onClick={handleFinalizeProvisioning}
                    className="mt-3 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-900"
                  >
                    Retry Provisioning
                  </button>
                </div>
              )}
              {!provisioning.loading && provisioning.result && (
                <div className="mt-2 space-y-2">
                  <p>Status: {provisioning.result.provisioningStatus || "active"}</p>
                  <p>Live number: {provisioning.result.phoneNumber || state.result.twilioPhoneNumber || "n/a"}</p>
                  <button
                    type="button"
                    onClick={handleVerifyTestCall}
                    disabled={testCall.loading}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white disabled:bg-gray-300"
                  >
                    {testCall.loading ? "Checking..." : mobileDevice ? "Test My Number (Call Now)" : "Test My Number"}
                  </button>
                  {testCall.error && <p className="text-sm text-red-600">{testCall.error}</p>}
                  {testCall.result?.message && <p className="text-sm text-green-700">{testCall.result.message}</p>}
                </div>
              )}
            </div>
          )}

          {!mobileDevice && (
            <button
              type="button"
              onClick={() => navigate(getPostPaymentRoute())}
              className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Continue to Dashboard
            </button>
          )}

          {mobileDevice && (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">You're all set. Choose your next step:</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => navigate(getPostPaymentRoute())}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Continue on Web
                </button>
                <a
                  href={iosAppStoreUrl}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-center text-sm font-semibold text-gray-900"
                >
                  Download iOS App
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
