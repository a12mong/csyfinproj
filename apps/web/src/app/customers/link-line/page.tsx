"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function LinkLineRedirectHandler() {
  const [statusText, setStatusText] = useState("Initializing LINE Connection...");
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    async function handleLiffRedirect() {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
      if (!liffId) {
        setError("Configuration error: LIFF ID is not defined.");
        return;
      }

      try {
        const { default: liff } = await import("@line/liff");
        
        // Parse liff.state from URL query params. 
        // When LIFF redirects, it sets liff.state to the subpath, e.g. "/1a253a5f-1d9d-4736-aa27-c996fdd8aafb"
        const liffState = searchParams.get("liff.state");
        
        await liff.init({ liffId });
        
        if (liffState) {
          // Clean the state to get the customer ID (remove leading slashes)
          const cleanId = liffState.replace(/^\/+/, "");
          if (cleanId) {
            setStatusText("Redirecting back to your link page...");
            router.replace(`/customers/link-line/${cleanId}`);
            return;
          }
        }
        
        // Fallback: If no state, go to home
        router.replace("/");
      } catch (err) {
        console.error("Error handling LIFF callback redirect:", err);
        setError("Failed to process LINE Login callback. Please try scanning the QR code again.");
      }
    }

    handleLiffRedirect();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f7f5] p-6 text-gray-800">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">LINE Login Callback Error</h2>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f7f5] p-6 text-gray-800">
      <div className="flex flex-col items-center space-y-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#06C755] border-t-transparent" />
        <p className="text-sm font-medium text-gray-500">{statusText}</p>
      </div>
    </div>
  );
}

export default function LinkLinePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7f5]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#06C755] border-t-transparent" />
      </div>
    }>
      <LinkLineRedirectHandler />
    </Suspense>
  );
}
