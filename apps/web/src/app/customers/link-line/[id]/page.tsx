"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface CustomerLinkStatus {
  name: string;
  isLineLinked: boolean;
  lineId: string | null;
}

export default function LinkLinePage() {
  const params = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<CustomerLinkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lineUserId, setLineUserId] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchStatus() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<CustomerLinkStatus>(`/customers/${params.id}/link-status`);
        setCustomer(res);
        if (res.isLineLinked && res.lineId) {
          setLineUserId(res.lineId);
          setSuccess(true);
        } else {
          // Generate a mockup LINE User ID for the user to copy/edit for testing
          const randHex = Array.from({ length: 32 }, () =>
            Math.floor(Math.random() * 16).toString(16)
          ).join("");
          setLineUserId(`U${randHex}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load customer information");
      } finally {
        setLoading(false);
      }
    }
    if (params.id) {
      fetchStatus();
    }
  }, [params.id]);

  async function handleLink(e: React.FormEvent) {
    e.preventDefault();
    if (!lineUserId.trim()) return;

    setLinking(true);
    setError(null);
    try {
      await apiFetch(`/customers/${params.id}/link-line`, {
        method: "POST",
        body: JSON.stringify({ lineId: lineUserId.trim() }),
      });
      setSuccess(true);
      if (customer) {
        setCustomer({
          ...customer,
          isLineLinked: true,
          lineId: lineUserId.trim(),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link LINE account");
    } finally {
      setLinking(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f7f5] p-6 text-gray-800">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#06C755] border-t-transparent" />
          <p className="text-sm font-medium text-gray-500">Loading LINE Connection...</p>
        </div>
      </div>
    );
  }

  if (error && !customer) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f7f5] p-6 text-gray-800">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Connecting</h2>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <p className="text-xs text-gray-400">Please make sure the link URL is correct or try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f7f5] text-gray-800 font-sans">
      {/* LINE Green Top Accent */}
      <div className="h-2 w-full bg-[#06C755]" />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden border border-gray-100">
          
          {/* Header */}
          <div className="bg-[#06C755] px-6 py-5 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* LINE Logo */}
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#06C755] font-black text-lg select-none">
                LINE
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight">LINE Login</h1>
                <p className="text-xs text-[#d2ffd6] font-medium">Account Connection</p>
              </div>
            </div>
            <div className="text-xs font-mono bg-[#05ab49] px-2.5 py-1 rounded-full text-white/90">
              csyfinproj
            </div>
          </div>

          {success ? (
            /* Success Screen */
            <div className="p-8 text-center space-y-6 animate-fadeIn">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-[#06C755] ring-8 ring-green-100">
                <svg className="h-12 w-12 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">Successfully Connected!</h2>
                <p className="text-sm text-gray-500">
                  <span className="font-semibold text-gray-700">{customer?.name}</span>'s LINE account has been securely linked to their database record.
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 text-left font-mono text-xs text-gray-500 space-y-2">
                <div className="flex justify-between">
                  <span>Customer Name:</span>
                  <span className="font-semibold text-gray-800">{customer?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>LINE ID Linked:</span>
                  <span className="font-semibold text-gray-800 text-right truncate max-w-[200px]" title={lineUserId}>
                    {lineUserId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Connection Status:</span>
                  <span className="font-semibold text-[#06C755]">ACTIVE</span>
                </div>
              </div>

              <div className="pt-2 text-xs text-gray-400">
                You can now safely close this window. Future payment reminders and receipts will be sent to your LINE application.
              </div>
            </div>
          ) : (
            /* Authorization Screen (LINE OAuth style) */
            <div className="p-6 space-y-6">
              
              {/* Permission Request Description */}
              <div className="text-center space-y-2">
                <h2 className="text-lg font-bold text-gray-900">Link with LINE Account</h2>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                  Authorizing will link your LINE User ID with your customer record for <span className="font-semibold text-gray-700">csyfinproj</span>.
                </p>
              </div>

              {/* Linking details card */}
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-4 flex items-center gap-4">
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600 font-bold text-lg shadow-sm border border-white">
                  {customer?.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Database Record</p>
                  <p className="text-sm font-bold text-gray-800 truncate">{customer?.name}</p>
                  <p className="text-xs text-gray-500">Customer UUID: ...{params.id.slice(-12)}</p>
                </div>
              </div>

              {/* LINE App Authorization Checklist */}
              <div className="space-y-3.5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Required Permissions</p>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-100 text-[#06C755]">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <div className="text-xs">
                      <p className="font-semibold text-gray-800">Retrieve LINE Profile</p>
                      <p className="text-gray-400">Allows matching your LINE display name and avatar.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-100 text-[#06C755]">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <div className="text-xs">
                      <p className="font-semibold text-gray-800">Retrieve LINE User ID</p>
                      <p className="text-gray-400">Used to match incoming webhook payments and deliver notifications.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Simulated LINE user credentials */}
              <form onSubmit={handleLink} className="space-y-4 pt-2 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    LINE User ID (Simulated)
                  </label>
                  <input
                    type="text"
                    value={lineUserId}
                    onChange={(e) => setLineUserId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs font-mono focus:border-[#06C755] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#06C755] transition-all"
                    placeholder="U123456789..."
                    required
                  />
                  <p className="mt-1.5 text-[10px] text-gray-400 leading-tight">
                    * This ID simulates the unique LINE identifier received during OAuth login. For testing webhook features, copy this ID.
                  </p>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-100 px-3.5 py-2.5 text-xs text-red-600">
                    {error}
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={linking}
                    className="w-full py-3 bg-[#06C755] hover:bg-[#05b04b] text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-green-100 hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {linking ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Linking Account...</span>
                      </>
                    ) : (
                      <span>Agree and Link Account</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-[11px] text-gray-400">
        &copy; {new Date().getFullYear()} csyfinproj &bull; Powered by LINE Front-end Framework (Simulation)
      </footer>
    </div>
  );
}
