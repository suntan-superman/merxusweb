import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { finalizeProvisioning, verifyCheckoutSession, verifyTestCallReadiness } from "../api/billing";
import { useAuth } from "../context/AuthContext";

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, loading } = useAuth();
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
    } catch (error) {
      setTestCall({
        loading: false,
        error: error.response?.data?.error || "Failed to verify test call readiness.",
        result: null,
      });
    }
  }, [provisioning.result, state.result, tenantTypeFromParams]);

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
                    {testCall.loading ? "Checking..." : "Test My Number"}
                  </button>
                  {testCall.error && <p className="text-sm text-red-600">{testCall.error}</p>}
                  {testCall.result?.message && <p className="text-sm text-green-700">{testCall.result.message}</p>}
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() =>
              navigate(
                `/setup?type=${encodeURIComponent(state.result.tenantType || tenantTypeFromParams)}&tenantId=${encodeURIComponent(state.result.tenantId || tenantIdFromParams)}&verified=1`
              )
            }
            className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Return to Setup
          </button>
        </div>
      )}
    </div>
  );
}
