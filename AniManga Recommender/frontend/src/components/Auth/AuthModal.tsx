// frontend/src/components/Auth/AuthModal.tsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { csrfUtils, sanitizeInput, passwordUtils } from "../../utils/security"; // ✅ NEW: Import security utilities
import "./AuthModal.css";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup";
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = "login" }) => {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [csrfToken, setCsrfToken] = useState(""); // ✅ NEW: CSRF token state
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]); // ✅ NEW: Password validation errors

  const { signIn, signUp } = useAuth();

  // ✅ NEW: Generate CSRF token when modal opens
  useEffect(() => {
    if (isOpen) {
      const token = csrfUtils.generateToken();
      setCsrfToken(token);
    }
    return () => {
      if (!isOpen) {
        csrfUtils.removeToken();
      }
    };
  }, [isOpen]);

  // ✅ NEW: Real-time password validation
  useEffect(() => {
    if (mode === "signup" && password) {
      const validation = passwordUtils.validateStrength(password);
      setPasswordErrors(validation.errors);
    } else {
      setPasswordErrors([]);
    }
  }, [password, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // ✅ NEW: CSRF validation
      if (!csrfUtils.validateToken(csrfToken)) {
        throw new Error("Invalid security token. Please refresh and try again.");
      }

      // ✅ NEW: Input sanitization
      const sanitizedEmail = sanitizeInput(email);
      const sanitizedDisplayName = sanitizeInput(displayName);

      // ✅ NEW: Password strength validation for signup
      if (mode === "signup") {
        const passwordValidation = passwordUtils.validateStrength(password);
        if (!passwordValidation.isValid) {
          throw new Error("Password does not meet security requirements");
        }
      }

      if (mode === "login") {
        const { error } = await signIn(sanitizedEmail, password);
        if (error) throw error;
      } else {
        const { error } = await signUp(sanitizedEmail, password, {
          display_name: sanitizedDisplayName,
        });
        if (error) throw error;
      }
      onClose();
    } catch (err: any) {
      // ✅ UPDATED: More secure error handling
      const errorMessage = err.message || "An error occurred. Please try again.";
      setError(errorMessage);
      console.warn("Auth error occurred:", err.code); // ✅ UPDATED: Only log error code, not full details
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose}>
          ×
        </button>

        <h2>{mode === "login" ? "Sign In" : "Sign Up"}</h2>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* ✅ NEW: CSRF token hidden field */}
          <input type="hidden" name="csrf_token" value={csrfToken} />

          {mode === "signup" && (
            <div className="form-group">
              <label htmlFor="displayName">Display Name</label>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required={mode === "signup"}
                maxLength={50} // ✅ NEW: Input length limit
                pattern="[a-zA-Z0-9\s]+" // ✅ NEW: Basic input pattern
                title="Display name should only contain letters, numbers, and spaces"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={100} // ✅ NEW: Input length limit
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8} // ✅ UPDATED: Increased from 6 to 8
              maxLength={128} // ✅ NEW: Maximum length
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
            {/* ✅ NEW: Password strength indicator */}
            {mode === "signup" && password && (
              <div className="password-requirements">
                {passwordErrors.length > 0 && (
                  <ul className="password-errors">
                    {passwordErrors.map((error, index) => (
                      <li key={index} className="password-error">
                        ❌ {error}
                      </li>
                    ))}
                  </ul>
                )}
                {passwordErrors.length === 0 && password.length > 0 && (
                  <p className="password-success">✅ Password meets all requirements</p>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading || (mode === "signup" && passwordErrors.length > 0)} // ✅ NEW: Disable if password invalid
          >
            {loading ? "Loading..." : mode === "login" ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <p className="auth-switch">
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <button type="button" onClick={() => setMode("signup")} className="auth-switch-btn">
                Sign Up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button type="button" onClick={() => setMode("login")} className="auth-switch-btn">
                Sign In
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};
