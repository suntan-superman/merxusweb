import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const INDUSTRIES = [
  { id: "voice", label: "Office", description: "Never miss business calls and lead follow-up." },
  { id: "real_estate", label: "Real Estate", description: "Capture listing inquiries and schedule showings." },
  { id: "restaurant", label: "Restaurant", description: "Handle orders, reservations, and peak-hour calls." },
];

export default function InstagramLandingPage() {
  const navigate = useNavigate();
  const [tenantType, setTenantType] = useState("voice");

  const selected = useMemo(
    () => INDUSTRIES.find((item) => item.id === tenantType) || INDUSTRIES[0],
    [tenantType]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white">
      <div className="mx-auto flex w-full max-w-[480px] flex-col px-4 pb-28 pt-10">
        <p className="mb-4 text-xs uppercase tracking-[0.18em] text-emerald-400">Merxus AI</p>
        <h1 className="text-4xl font-black leading-tight">Never Miss Calls Again</h1>
        <p className="mt-4 text-sm text-gray-300">
          Setup takes a few minutes. Choose your industry, verify email, reserve your number, and activate with checkout.
        </p>

        <div className="mt-8 space-y-3">
          {INDUSTRIES.map((item) => {
            const active = item.id === tenantType;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTenantType(item.id)}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  active
                    ? "border-emerald-400 bg-emerald-500/10"
                    : "border-gray-700 bg-gray-900/70 hover:border-gray-500"
                }`}
              >
                <p className="text-base font-semibold">{item.label}</p>
                <p className="mt-1 text-sm text-gray-300">{item.description}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-8 rounded-xl border border-gray-700 bg-gray-900/70 p-4">
          <p className="text-xs uppercase tracking-[0.15em] text-gray-400">Selected</p>
          <p className="mt-2 text-lg font-semibold">{selected.label}</p>
          <p className="mt-1 text-sm text-gray-300">{selected.description}</p>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-gray-800 bg-black/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto w-full max-w-[480px]">
          <button
            type="button"
            onClick={() => navigate(`/setup?type=${encodeURIComponent(tenantType)}`)}
            className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400"
          >
            Continue Setup
          </button>
        </div>
      </div>
    </div>
  );
}
