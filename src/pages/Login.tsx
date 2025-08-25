// src/pages/Login.tsx
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom"; // (optional: to read ?role=)
import { authAPI, type LoginData } from "../lib/auth-api";
import { useAuth } from "../lib/auth-context";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [params] = useSearchParams();

  // track which role the user *intends* to log in as
  const [loginRole, setLoginRole] = useState<"student" | "instructor">(
    (params.get("role") as "student" | "instructor") ?? "student"
  );

  const [formData, setFormData] = useState<LoginData>({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleInputChange = (field: keyof LoginData, value: string) => {
    setFormData((p) => ({ ...p, [field]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const tokens = await authAPI.login(formData);

      // fetch profile to know the actual role on the account
      let profile: any;
      try {
        profile = await authAPI.getProfile(tokens.IdToken);
        login(tokens, profile);
      } catch {
        // fallback if /profile isn’t available
        profile = { email: formData.email };
        login(tokens, profile);
      }

      // Enforce intended role if user clicked "Teacher Login"
      const actualRole = (profile?.role ?? "").toLowerCase();
      if (loginRole === "instructor" && actualRole !== "instructor") {
        setIsLoading(false);
        setError("This account isn’t an instructor account. Please use Student Login or sign up as an instructor.");
        return;
      }

      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Instead of navigating to signup, toggle the intended role and submit
  const handleTeacherLoginClick = () => {
    setLoginRole("instructor");
  };
  const handleStudentLoginClick = () => {
    setLoginRole("student");
  };

  return (
    <div className="login-container">
      <div className="login-background-decoration">
        {/* Decorations */}
        <img src="/images/atom.png" className="decor atom" alt="atom" />
        <img src="/images/chromosomes.png" className="decor chromosomes" alt="chromosomes" />
        <img src="/images/female-scientist.png" className="decor female-scientist" alt="scientist girl" />
        <img src="/images/male-scientist.png" className="decor male-scientist" alt="scientist man" />
      </div>

      <div className="login-content">
        <div className="login-welcome-section">
          <div className="login-logo">
            <h1 className="login-title">Virtual Lab</h1>
          </div>
          <p className="login-subtitle">Welcome back to your learning journey!</p>
        </div>

        <div className="login-form-card">
          <div className="login-card-header">
            <h2 className="login-card-title">Sign In</h2>
            <p className="login-card-subtitle">
              {loginRole === "instructor" ? "Instructor access" : "Enter your credentials to continue"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="login-error-alert">
                <span className="login-error-icon">⚠️</span>
                <span className="login-error-text">{error}</span>
              </div>
            )}

            <div className="login-form-group">
              <label className="login-label">Email Address</label>
              <input
                className="login-input"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="name@example.com"
                required
              />
            </div>

            <div className="login-form-group">
              <label className="login-label">Password</label>
              <input
                className="login-input"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {/* Role toggle buttons */}
            <div className="login-role-toggle">
              <button
                type="button"
                className={`role-chip ${loginRole === "student" ? "active" : ""}`}
                onClick={handleStudentLoginClick}
                disabled={isLoading}
                aria-pressed={loginRole === "student"}
              >
                Student
              </button>
              <button
                type="button"
                className={`role-chip ${loginRole === "instructor" ? "active" : ""}`}
                onClick={handleTeacherLoginClick}
                disabled={isLoading}
                aria-pressed={loginRole === "instructor"}
              >
                Instructor
              </button>
            </div>

            <div className="login-button-group">
              <button
                type="submit"
                className={`login-btn-primary ${isLoading ? "login-btn-loading" : ""}`}
                disabled={isLoading}
              >
                {isLoading && <div className="login-spinner"></div>}
                <span className="login-btn-text">
                  {isLoading ? "Signing in..." : loginRole === "instructor" ? "Login as Instructor" : "Login as Student"}
                </span>
              </button>
            </div>

            <div className="login-forgot-link">
              <button type="button" className="login-link-btn" onClick={() => navigate("/forgot-password")}>
                Forgot your password?
              </button>
            </div>
          </form>

          <div className="login-signup-section">
            <p className="login-signup-text">
              Don’t have an account?{" "}
              <button
                type="button"
                onClick={() =>
                  navigate(`/signup${loginRole === "instructor" ? "?role=instructor" : ""}`)
                }
                className="login-signup-link"
              >
                {loginRole === "instructor" ? "Sign up here" : "Sign up here"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
