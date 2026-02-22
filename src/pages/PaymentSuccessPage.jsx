import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { verifyCheckoutSession } from "../api/billing";
import { useAuth } from "../context/AuthContext";

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, loading } = useAuth();
  const [state, setState] = useState({
    loading: true,
    error: "",
    result: null,
  });

  useEffect(() => {
    const run = async () => {
      const sessionId = params.get("session_id");
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
  }, [loading, params, user]);

  if (!loading && !user) {
    return (
      <div className="mx-auto mt-12 max-w-xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Sign in required</h1>
        <p className="mt-2 text-sm text-gray-600">
          Payment verification requires the same authenticated Firebase account used to checkout.
        </p>
        <button
          type="button"
          onClick={() => navigate("/login")}
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
          <p>Subscription status: {state.result.subscriptionStatus || "n/a"}</p>
          <button
            type="button"
            onClick={() => navigate("/setup")}
            className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Return to Setup
          </button>
        </div>
      )}
    </div>
  );
}
