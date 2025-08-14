// src/pages/Confirm.tsx
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authAPI, type ConfirmData } from "../lib/auth-api";
import "./Confirm.css";

export default function Confirm() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<ConfirmData>({
    email: params.get("email") || "",
    code: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleInputChange = (field: keyof ConfirmData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await authAPI.confirmSignup(formData);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirmation failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    // Optional: implement a /auth/resend endpoint on the backend then call it here.
    console.log("Resend code not implemented yet");
  };

  if (success) {
    return (
      <div className="confirm-success-container">
        <div className="confirm-background-decoration">
          <div className="confirm-floating-shape confirm-shape-1"></div>
          <div className="confirm-floating-shape confirm-shape-2"></div>
          <div className="confirm-floating-shape confirm-shape-3"></div>
        </div>
        <div className="confirm-success-card">
          <div className="confirm-success-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>
          <h2 className="confirm-success-title">Account Confirmed!</h2>
          <p className="confirm-success-text">Your account has been successfully verified.</p>
          <p className="confirm-success-redirect">Redirecting to login...</p>
          <div className="confirm-success-loader">
            <div className="confirm-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="confirm-container">
      <div className="confirm-background-decoration">
        <div className="confirm-floating-shape confirm-shape-1"></div>
        <div className="confirm-floating-shape confirm-shape-2"></div>
        <div className="confirm-floating-shape confirm-shape-3"></div>
        <div className="confirm-floating-shape confirm-shape-4"></div>
      </div>

      <div className="confirm-decorative-elements">
        <div className="confirm-atom-icon">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <circle cx="12" cy="12" r="2"/>
            <path d="M12 1v6m0 6v6"/>
            <path d="m1 12 6 0m6 0 6 0"/>
            <circle cx="12" cy="12" r="8"/>
            <circle cx="12" cy="12" r="12"/>
          </svg>
        </div>
        <div className="confirm-molecule-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <circle cx="12" cy="5" r="3"/>
            <circle cx="12" cy="19" r="3"/>
            <circle cx="5" cy="12" r="3"/>
            <circle cx="19" cy="12" r="3"/>
            <line x1="12" y1="8" x2="12" y2="16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
          </svg>
        </div>
      </div>

      <div className="confirm-content">
        <header className="confirm-header">
          <div className="confirm-logo">
            <div className="confirm-logo-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4"/>
                <circle cx="12" cy="12" r="9"/>
              </svg>
            </div>
            <h1 className="confirm-title">Confirm Account</h1>
          </div>
          <p className="confirm-subtitle">Enter the verification code sent to your email</p>
        </header>

        <div className="confirm-form-card">
          <form onSubmit={handleSubmit} className="confirm-form">
            {error && (
              <div className="confirm-error-alert">
                <div className="confirm-error-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
                <span className="confirm-error-text">{error}</span>
              </div>
            )}

            <div className="confirm-form-group">
              <label className="confirm-label">
                <div className="confirm-label-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <span>Email Address</span>
              </label>
              <input
                className="confirm-input"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                required
                readOnly
              />
            </div>

            <div className="confirm-form-group">
              <label className="confirm-label">
                <div className="confirm-label-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <circle cx="12" cy="16" r="1"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <span>Verification Code</span>
              </label>
              <input
                className="confirm-input confirm-code-input"
                value={formData.code}
                onChange={(e) => handleInputChange("code", e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
                required
                autoComplete="off"
              />
              <div className="confirm-code-hint">
                Check your email for the 6-digit verification code
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`confirm-submit-btn ${isLoading ? 'confirm-submit-loading' : ''}`}
            >
              {isLoading && <div className="confirm-spinner"></div>}
              <span className="confirm-submit-text">Confirm Account</span>
              <div className="confirm-submit-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </div>
            </button>

            <div className="confirm-help-section">
              <div className="confirm-resend-section">
                <span className="confirm-help-text">Didn't receive the code?</span>
                <button 
                  type="button" 
                  onClick={handleResendCode} 
                  className="confirm-link-btn"
                >
                  Resend code
                </button>
              </div>

              <div className="confirm-back-section">
                <span className="confirm-help-text">Need help?</span>
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="confirm-link-btn"
                >
                  Back to login
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}