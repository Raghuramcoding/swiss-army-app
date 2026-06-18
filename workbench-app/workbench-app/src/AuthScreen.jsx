import { useState } from "react";
import { Code2, Loader2 } from "lucide-react";
import { useAuth } from "./AuthContext";

export default function AuthScreen({ onDone, onSkip }) {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState("signup"); // signup | login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") await signup(email, password);
      else await login(email, password);
      onDone?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-ink text-[#EDEEF0] font-sans flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-amber">
            <Code2 size={18} className="text-ink" strokeWidth={2.5} />
          </div>
          <h1 className="font-mono text-lg font-semibold tracking-tight">Workbench</h1>
        </div>

        <h2 className="text-xl font-semibold mb-1.5">
          {mode === "signup" ? "Create your Pro account" : "Welcome back"}
        </h2>
        <p className="text-sm text-[#8B92A0] mb-6">
          {mode === "signup"
            ? "Pro accounts get hosted AI tools with no API key needed."
            : "Sign in to manage your Pro subscription."}
        </p>

        <form onSubmit={submit} className="space-y-3.5">
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-[#8B92A0]">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-well px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber/60"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-[#8B92A0]">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-well px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber/60"
              placeholder="At least 8 characters"
            />
          </div>

          {error && <p className="text-sm text-[#E7A893]">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-amber px-4 py-2.5 text-sm font-semibold text-ink hover:bg-[#f0b257] disabled:opacity-50 transition-colors"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="text-sm text-[#8B92A0] mt-4">
          {mode === "signup" ? "Already have an account?" : "Need an account?"}{" "}
          <button onClick={() => setMode(mode === "signup" ? "login" : "signup")} className="text-teal hover:underline">
            {mode === "signup" ? "Sign in" : "Create one"}
          </button>
        </p>

        {onSkip && (
          <button onClick={onSkip} className="text-sm text-[#5A6068] hover:text-white mt-6 block">
            Skip — I'll use my own API key instead
          </button>
        )}
      </div>
    </div>
  );
}
