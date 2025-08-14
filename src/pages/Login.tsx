// src/pages/Login.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI, type LoginData } from "../lib/auth-api";
import { useAuth } from "../lib/auth-context";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

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
      try {
        const profile = await authAPI.getProfile(tokens.AccessToken);
        login(tokens, profile);
      } catch {
        login(tokens, { email: formData.email });
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTeacherLogin = () => {
    navigate("/signup?role=instructor");
  };

  return (
    <div className="login-container">
      <div className="login-background-decoration">
        <div className="login-floating-shape login-shape-1"></div>
        <div className="login-floating-shape login-shape-2"></div>
        <div className="login-floating-shape login-shape-3"></div>
        <div className="login-floating-shape login-shape-4"></div>
        <div className="login-floating-shape login-shape-5"></div>
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
            <p className="login-card-subtitle">Enter your credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="login-error-alert">
                <span className="login-error-icon">⚠️</span>
                <span className="login-error-text">{error}</span>
              </div>
            )}

            <div className="login-form-group">
              <label className="login-label">
                Email Address
              </label>
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
              <label className="login-label">
                Password
              </label>
              <input
                className="login-input"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <div className="login-button-group">
              <button
                type="button"
                className="login-btn-secondary"
                onClick={handleTeacherLogin}
                disabled={isLoading}
              >
                <span className="login-btn-text">Teacher Login</span>
              </button>
              
              <button 
                type="submit" 
                className={`login-btn-primary ${isLoading ? 'login-btn-loading' : ''}`}
                disabled={isLoading}
              >
                {isLoading && <div className="login-spinner"></div>}
                <span className="login-btn-text">
                  {isLoading ? "Signing in..." : "Student Login"}
                </span>
              </button>
            </div>

            <div className="login-forgot-link">
              <button type="button" className="login-link-btn">
                Forgot your password?
              </button>
            </div>
          </form>

          <div className="login-signup-section">
            <p className="login-signup-text">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/signup")}
                className="login-signup-link"
              >
                Sign up here
              </button>
            </p>
          </div>
        </div>
      </div>
          </div>
  
  );
}