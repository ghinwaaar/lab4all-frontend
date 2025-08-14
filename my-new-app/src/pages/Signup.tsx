// src/pages/Signup.tsx
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authAPI, type SignupData } from "../lib/auth-api";
import { Loader2 } from "lucide-react";
import "./Signup.css";

export default function Signup() {
  const [params] = useSearchParams();
  const defaultRole = (params.get("role") as "student" | "instructor") ?? "student";
  const navigate = useNavigate();

  const [formData, setFormData] = useState<SignupData>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: defaultRole,
    grade: "",
    schoolId: "",
  });

  const [schoolMode, setSchoolMode] = useState<"id" | "name">("id");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handle = (k: keyof SignupData, v: string) => {
    setFormData((p) => ({ ...p, [k]: v }));
    setError("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const payload: SignupData = { ...formData };

      if (payload.role === "student") {
        if (schoolMode === "id") {
          payload.schoolName = undefined;
          payload.countryCode = undefined;
          payload.city = undefined;
          if (!payload.schoolId) {
            throw new Error("Please enter your School ID.");
          }
        } else {
          payload.schoolId = undefined;
          if (!payload.schoolName) {
            throw new Error("Please enter your School Name.");
          }
        }
      } else {
        delete payload.schoolId;
        delete payload.schoolName;
        delete payload.countryCode;
        delete payload.city;
      }

      await authAPI.signup(payload);
      setSuccess(true);
      navigate(`/confirm?email=${encodeURIComponent(formData.email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="signup-success-container">
        <div className="signup-success-card">
          <div className="signup-success-icon">📧</div>
          <h2 className="signup-success-title">Check your email</h2>
          <p className="signup-success-text">
            We've sent a confirmation code to{" "}
            <span className="signup-success-email">{formData.email}</span>
          </p>
          <div className="signup-success-decoration">
            <div className="signup-floating-element signup-element-1">✨</div>
            <div className="signup-floating-element signup-element-2">🎓</div>
            <div className="signup-floating-element signup-element-3">📚</div>
          </div>
        </div>
      </div>
    );
  }

  const isStudent = formData.role === "student";

  return (
    <div className="signup-container">
      <div className="signup-background-decoration">
        <div className="signup-floating-shape signup-shape-1"></div>
        <div className="signup-floating-shape signup-shape-2"></div>
        <div className="signup-floating-shape signup-shape-3"></div>
        <div className="signup-floating-shape signup-shape-4"></div>
      </div>
      
      <div className="signup-content">
        <header className="signup-header">
          <div className="signup-logo">
            <span className="signup-logo-icon">🧪</span>
            <h1 className="signup-title">Virtual Lab</h1>
          </div>
          <p className="signup-subtitle">
            Create your <span className="signup-role-badge">{formData.role}</span> account
          </p>
        </header>

        <div className="signup-form-card">
          <form onSubmit={submit} className="signup-form">
            {error && (
              <div className="signup-error-alert">
                <span className="signup-error-icon">⚠️</span>
                <span className="signup-error-text">{error}</span>
              </div>
            )}

            <div className="signup-form-grid">
              <div className="signup-form-group">
                <label className="signup-label">
                  <span className="signup-label-icon">👤</span>
                  First name
                </label>
                <input
                  className="signup-input"
                  value={formData.firstName}
                  onChange={(e) => handle("firstName", e.target.value)}
                  required
                />
              </div>
              <div className="signup-form-group">
                <label className="signup-label">
                  <span className="signup-label-icon">👤</span>
                  Last name
                </label>
                <input
                  className="signup-input"
                  value={formData.lastName}
                  onChange={(e) => handle("lastName", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="signup-form-group">
              <label className="signup-label">
                Email
              </label>
              <input
                className="signup-input"
                type="email"
                value={formData.email}
                onChange={(e) => handle("email", e.target.value)}
                placeholder="name@example.com"
                required
              />
            </div>

            <div className="signup-form-group">
              <label className="signup-label">
                Password
              </label>
              <input
                className="signup-input"
                type="password"
                value={formData.password}
                onChange={(e) => handle("password", e.target.value)}
                placeholder="••••••••"
                minLength={8}
                required
              />
            </div>

            <div className="signup-form-group">
              <label className="signup-label">
                Role
              </label>
              <select
                className="signup-select"
                value={formData.role}
                onChange={(e) => handle("role", e.target.value as "student" | "instructor")}
              >
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
              </select>
            </div>

            <div className="signup-form-group">
              <label className="signup-label">
                Grade
              </label>
              <input
                className="signup-input"
                value={formData.grade}
                onChange={(e) => handle("grade", e.target.value)}
                placeholder="e.g. 11"
                required
              />
            </div>

            {isStudent && (
              <div className="signup-school-section">
                <div className="signup-school-header">
                  <label className="signup-label">
                    School Information
                  </label>
                  <button
                    type="button"
                    className="signup-toggle-btn"
                    onClick={() => setSchoolMode((m) => (m === "id" ? "name" : "id"))}
                    title="Toggle School input mode"
                  >
                    {schoolMode === "id" ? "Use school name" : "Use school ID"}
                  </button>
                </div>

                {schoolMode === "id" ? (
                  <div className="signup-form-group">
                    <label className="signup-label-small">School ID (slug)</label>
                    <input
                      className="signup-input"
                      value={formData.schoolId || ""}
                      onChange={(e) => handle("schoolId", e.target.value)}
                      placeholder="e.g. international-college-beirut"
                      required
                    />
                  </div>
                ) : (
                  <>
                    <div className="signup-form-group">
                      <label className="signup-label-small">School Name</label>
                      <input
                        className="signup-input"
                        value={formData.schoolName || ""}
                        onChange={(e) => handle("schoolName", e.target.value)}
                        placeholder="International College Beirut"
                        required
                      />
                    </div>
                    <div className="signup-form-grid">
                      <div className="signup-form-group">
                        <label className="signup-label-small">Country Code</label>
                        <input
                          className="signup-input"
                          value={formData.countryCode || ""}
                          onChange={(e) => handle("countryCode", e.target.value.toUpperCase())}
                          placeholder="LB"
                          maxLength={2}
                        />
                      </div>
                      <div className="signup-form-group">
                        <label className="signup-label-small">City</label>
                        <input
                          className="signup-input"
                          value={formData.city || ""}
                          onChange={(e) => handle("city", e.target.value)}
                          placeholder="Beirut"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`signup-submit-btn ${isLoading ? 'signup-submit-loading' : ''}`}
            >
              {isLoading && <Loader2 className="signup-loader" />}
              <span className="signup-submit-text">Create account</span>
            </button>

            <p className="signup-login-link">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="signup-link-btn"
              >
                Sign in here
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}