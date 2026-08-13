import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function Login() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
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
    <div className="shell" style={{ maxWidth: 420 }}>
      <div className="brand">
        <span className="brand-mark" />
        <span className="brand-name">VitalAI</span>
      </div>

      <div className="card">
        <h1 style={{ fontSize: 24 }}>{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
        <p style={{ marginBottom: 4 }}>
          {mode === "signin"
            ? "Sign in to check symptoms and talk to your wellness coach."
            : "Set up an account to start using VitalAI."}
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />

          {error && <p className="error-text">{error}</p>}
          {info && <p className="error-text" style={{ color: "#2f6b4f" }}>{info}</p>}

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
  );
}
