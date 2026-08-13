import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function Login() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setInfo("Account created. You can sign in now (check your email if confirmation is required).");
        setMode("signin");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }

    setLoading(false);
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="brand" style={{ justifyContent: "center" }}>
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">VitalAI</span>
        </div>

        <div className="card">
          <h1 style={{ fontSize: 24 }}>{mode === "signin" ? "Welcome back" : "Create account"}</h1>
          <p style={{ marginBottom: 8 }}>
            {mode === "signin"
              ? "Sign in to access your health & wellness tools."
              : "Set up an account to start using VitalAI."}
          </p>

          <form onSubmit={handleSubmit}>
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />

            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
            />

            {error && <p className="error-text" role="alert">{error}</p>}
            {info && <p className="success-text" role="status">{info}</p>}

            <div className="row">
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setError("");
                  setInfo("");
                }}
              >
                {mode === "signin" ? "Need an account?" : "Have an account?"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
