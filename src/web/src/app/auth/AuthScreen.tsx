"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { type FormEvent, useState } from "react";
import "./auth.css";

export type Screen =
  | "sign-in"
  | "sign-up"
  | "forgot-password"
  | "reset-password"
  | "verify-email";

function Illustration() {
  return (
    <svg className="auth-art" viewBox="0 0 360 155" aria-hidden="true">
      <defs>
        <pattern
          id="auth-dots"
          width="12"
          height="12"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="2" cy="2" r=".6" fill="#b8b8a4" />
        </pattern>
      </defs>
      <path fill="url(#auth-dots)" d="M0 0h360v155H0z" />
      <g fill="none" stroke="#49636b" strokeWidth="1.2">
        <path d="M25 135V30m-4 5 4-5 4 5M25 135h195m-5-4 5 4-5 4" />
        <path d="M25 135Q111-9 195 135" strokeDasharray="4 3" />
        <path d="M223 51h65v58h-65zM223 109l65-58M288 109V36q0-12 12-12h28v35q0 12-12 12v63" />
      </g>
      <g fill="#146164">
        <circle cx="64" cy="85" r="3.5" />
        <circle cx="111" cy="62" r="5" />
        <circle cx="161" cy="92" r="4" />
      </g>
      <circle cx="25" cy="135" r="6.5" fill="#e4b746" stroke="#49636b" />
      <path d="M223 51h65v58h-65z" fill="#c6cbb1" opacity=".45" />
      <g fill="#e2e6d4" stroke="#49636b">
        <circle cx="328" cy="25" r="20" />
        <circle cx="316" cy="82" r="15" />
        <path d="M303 121h26v26h-26z" fill="#f0d99c" />
      </g>
      <g fill="none" stroke="#285e56" strokeWidth="1.5">
        <path d="M324 15h8m-6 0v9l-6 10h16l-6-10v-9m-6 13h8M311 82h10m-5-5v10M311 77l10 10m0-10-10 10M310 134h12m-6-6v12" />
      </g>
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5h6.6c3.8-3.5 6.1-8.7 6.1-14.9z"
      />
      <path
        fill="#34A853"
        d="M24 44c5.5 0 10.1-1.8 13.5-4.6l-6.6-5c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2A20.4 20.4 0 0 0 24 44z"
      />
      <path
        fill="#FBBC05"
        d="M12.6 27.9a12.2 12.2 0 0 1 0-7.8v-5.2H5.8a20 20 0 0 0 0 18.2z"
      />
      <path
        fill="#EA4335"
        d="M24 11.7c3 0 5.7 1 7.8 3.1l5.9-5.9A19.8 19.8 0 0 0 24 4 20.4 20.4 0 0 0 5.8 14.9l6.8 5.2c1.6-4.8 6.1-8.4 11.4-8.4z"
      />
    </svg>
  );
}

function Password({
  label,
  name,
  error,
}: {
  label: string;
  name: string;
  error?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="auth-field">
      <label htmlFor={name}>{label}</label>
      <div className="auth-password">
        <input
          id={name}
          name={name}
          type={show ? "text" : "password"}
          autoComplete={
            name === "password" ? "current-password" : "new-password"
          }
          required
          maxLength={128}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : undefined}
        />
        <button
          type="button"
          aria-label={`${show ? "Hide" : "Show"} ${label.toLowerCase()}`}
          aria-pressed={show}
          onClick={() => setShow(!show)}
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
      {error && (
        <span id={`${name}-error`} className="auth-error">
          {error}
        </span>
      )}
    </div>
  );
}

export default function AuthScreen({
  screen,
  token,
  email: initialEmail,
  providerError,
  configured,
  google,
  initialExpired,
  unavailable,
}: {
  screen: Screen;
  token: string;
  email: string;
  providerError: boolean;
  configured: boolean;
  google: boolean;
  initialExpired: boolean;
  unavailable: boolean;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [expired, setExpired] = useState(initialExpired);
  const [message, setMessage] = useState(
    providerError ? "Sign-in could not be completed. Please try again." : "",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const signup = screen === "sign-up";
  const signin = screen === "sign-in";
  const reset = screen === "reset-password";
  const verify = screen === "verify-email";
  const forgot = screen === "forgot-password";
  const title = signin
    ? "Welcome to your lab"
    : signup
      ? "Create your lab account"
      : forgot
        ? "Forgot your password?"
        : reset
          ? done
            ? "Password reset"
            : "Choose a new password"
          : done && token
            ? "Email verified"
            : "Check your inbox";
  const subtitle = signin
    ? "Sign in to save and revisit your experiments."
    : signup
      ? "Save your experiments and reusable components across devices."
      : forgot
        ? done
          ? "If an account exists for this email, we’ll send a password reset link."
          : "Enter your email address to request a password reset."
        : reset
          ? done
            ? "Your password has been updated."
            : expired
              ? "This reset link has expired."
              : "Use a long, unique password for your account."
          : done && token
            ? "Your account is ready. Sign in to open your lab."
            : expired
              ? "This verification link has expired. Request another email below."
              : "Open the verification link sent to your email address to finish creating your account.";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(
      form.get("password") ?? form.get("newPassword") ?? "",
    );
    const nextErrors: Record<string, string> = {};
    if (signin && !password) nextErrors.password = "Enter your password.";
    if (
      !reset &&
      !(verify && token && !expired) &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    )
      nextErrors.email = "Enter a valid email address.";
    if ((signup || reset) && password.length < 15)
      nextErrors.password = "Use at least 15 characters.";
    if ((signup || reset) && password !== form.get("confirmPassword"))
      nextErrors.confirmPassword = "Passwords don’t match.";
    setErrors(nextErrors);
    setMessage("");
    if (Object.keys(nextErrors).length) return;
    setBusy(true);
    try {
      if (signin) {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
          callbackUrl: "/",
        });
        if (!result?.ok) {
          setErrors({ password: "Email or password is incorrect." });
          return;
        }
        window.location.assign("/");
        return;
      }
      const action = signup
        ? "register"
        : forgot
          ? "forgot"
          : reset
            ? "reset"
            : token && !expired
              ? "verify"
              : "resend";
      const response = await fetch(`/api/auth/account/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, token }),
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) {
        if (response.status === 410) setExpired(true);
        else
          setMessage(result.error ?? "Something went wrong. Please try again.");
        return;
      }
      if (signup) {
        window.location.assign(
          `/auth/verify-email?email=${encodeURIComponent(email)}`,
        );
        return;
      }
      setDone(true);
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const label = signin
    ? "Sign in"
    : signup
      ? "Create account"
      : forgot
        ? "Send reset link"
        : reset
          ? "Reset password"
          : token && !expired
            ? "Verify email"
            : "Resend verification email";
  const loading = signin
    ? "Signing in…"
    : signup
      ? "Creating account…"
      : forgot
        ? "Sending reset link…"
        : reset
          ? "Resetting password…"
          : "Verifying…";
  return (
    <main className="auth-page">
      <Link href="/" className="auth-brand">
        <span aria-hidden="true">✳</span> apertus{" "}
        <span className="auth-suffix">/ local lab</span>
      </Link>
      <section
        className={`auth-card ${signin || signup ? "auth-card--form" : ""}`}
        aria-labelledby="auth-title"
      >
        {(signin || signup) && <Illustration />}
        {done && (forgot || reset || (verify && token)) && (
          <div className="auth-check" aria-hidden="true">
            ✓
          </div>
        )}
        <h1 id="auth-title">{title}</h1>
        <p className="auth-subtitle">{subtitle}</p>
        {!configured && (
          <p className="auth-error" role="alert">
            Sign-in is unavailable until the server is configured. You can
            continue as a guest.
          </p>
        )}
        {unavailable && (
          <p className="auth-error" role="alert">
            We couldn’t check this link. Please try again later.
          </p>
        )}
        {message && (
          <p className="auth-error" role="alert">
            {message}
          </p>
        )}
        {done && forgot ? (
          <>
            <p className="auth-email">{email}</p>
            <button
              className="auth-link"
              onClick={() => {
                setDone(false);
                setMessage("");
              }}
              type="button"
            >
              Try another email
            </button>
          </>
        ) : reset && expired ? (
          <Link href="/auth/forgot-password" className="auth-primary">
            Request a new link
          </Link>
        ) : (done && reset) || (done && verify && token) ? null : (
          <form onSubmit={submit} noValidate>
            <fieldset disabled={busy || !configured || unavailable}>
              {verify && email && !expired && !token ? (
                <p className="auth-email">{email}</p>
              ) : (
                !reset &&
                !(verify && token && !expired) && (
                  <div className="auth-field">
                    <label htmlFor="email">Email address</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={254}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={
                        errors.email ? "email-error" : undefined
                      }
                    />
                    {errors.email && (
                      <span className="auth-error" id="email-error">
                        {errors.email}
                      </span>
                    )}
                  </div>
                )
              )}
              {(signin || signup || reset) && (
                <Password
                  label={reset ? "New password" : "Password"}
                  name={signin ? "password" : "newPassword"}
                  error={errors.password}
                />
              )}
              {(signup || reset) && (
                <>
                  <Password
                    label={reset ? "Confirm new password" : "Confirm password"}
                    name="confirmPassword"
                    error={errors.confirmPassword}
                  />
                  <p className="auth-hint">
                    Use at least 15 characters. Choose a long, unique password.
                  </p>
                </>
              )}
              {signin && (
                <Link className="auth-forgot" href="/auth/forgot-password">
                  Forgot password?
                </Link>
              )}
              <button className="auth-primary" type="submit">
                {busy && <span className="auth-spinner" aria-hidden="true" />}
                {busy ? loading : label}
              </button>
            </fieldset>
            {verify && done && (
              <output className="auth-success">
                If verification is needed, a new email has been sent.
              </output>
            )}
          </form>
        )}
        {(signin || signup) && (
          <>
            <div className="auth-divider">or</div>
            <button
              disabled={busy || !google || !configured}
              type="button"
              className="auth-google"
              onClick={async () => {
                setBusy(true);
                try {
                  await signIn("google", { callbackUrl: "/" });
                } catch {
                  setMessage("Google sign-in could not be started.");
                  setBusy(false);
                }
              }}
            >
              <GoogleMark />
              Continue with Google
            </button>
            {!google && (
              <p className="auth-hint">Google sign-in is not configured yet.</p>
            )}
            <p className="auth-bottom">
              {signin ? "New here? " : "Already have an account? "}
              <Link href={signin ? "/auth/sign-up" : "/auth/sign-in"}>
                {signin ? "Create an account" : "Sign in"}
              </Link>
            </p>
          </>
        )}
        {signin ? (
          <>
            <Link href="/">Continue as guest</Link>
            <p className="auth-hint">Guest experiments stay on this device.</p>
          </>
        ) : (
          !signup && (
            <Link className="auth-back" href="/auth/sign-in">
              Back to sign in
            </Link>
          )
        )}
        <output className="auth-status">{busy ? loading : ""}</output>
      </section>
    </main>
  );
}
