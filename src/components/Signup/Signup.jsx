import React, { useState } from 'react';
import './Signup.css';

const Signup = ({ onToggle, onSignupSuccess }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.password.length < 6) {
      alert("Passphrase must be at least 6 characters long.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    onSignupSuccess && onSignupSuccess({
      fullName: formData.fullName,
      username: formData.username,
      email: formData.email,
      password: formData.password
    });
  };

  return (
    <div className="auth-container">
      <div className="card-header">
        <span>✎ BASIC SIGNUP INFO</span>
        <span>Vol. XXIV</span>
      </div>

      <div className="auth-toggle">
        <button className="toggle-btn" type="button" onClick={onToggle}>Sign In</button>
        <button className="toggle-btn active" type="button">Register</button>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <div className="form-input-wrapper">
            <input
              type="text"
              name="fullName"
              className="form-input"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
            {!formData.fullName && <span className="custom-placeholder">Julian Blackwood</span>}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label"> Username</label>
          <div className="form-input-wrapper">
            <input
              type="text"
              name="username"
              className="form-input"
              value={formData.username}
              onChange={handleChange}
              required
            />
            {!formData.username && <span className="custom-placeholder">j_blackwood</span>}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label"> Email</label>
          <div className="form-input-wrapper">
            <input
              type="email"
              name="email"
              className="form-input"
              value={formData.email}
              onChange={handleChange}
              required
            />
            {!formData.email && <span className="custom-placeholder">reader@nocturne.lib</span>}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label"> Password</label>
          <div className="form-input-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              className="form-input"
              value={formData.password}
              onChange={handleChange}
              required
            />
            {!formData.password && <span className="custom-placeholder">••••••••</span>}
            <span 
              className="password-toggle" 
              onClick={() => setShowPassword(!showPassword)}
              style={{ cursor: 'pointer', position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}
            >
              {showPassword ? "👁️‍🗨️" : "👁️"}
            </span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label"> Confirm Password</label>
          <div className="form-input-wrapper">
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              className="form-input"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
            {!formData.confirmPassword && <span className="custom-placeholder">••••••••</span>}
            <span 
              className="password-toggle" 
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{ cursor: 'pointer', position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}
            >
              {showConfirmPassword ? "👁️‍🗨️" : "👁️"}
            </span>
          </div>
        </div>

        <div className="checkbox-group">
          <input type="checkbox" className="wax-seal-checkbox" id="terms" required />
          <label htmlFor="terms" className="checkbox-label">
            I agree to the Library's Terms of Silence
          </label>
        </div>

        <button type="submit" className="submit-btn">
          JOIN THE REGISTRY
        </button>
      </form>

      <div className="quote-section">
        <span className="quote-text">"Knowledge is the only wealth that never decays."</span>
        <span className="quote-author">— ANONYMOUS</span>
      </div>
    </div>
  );
};

export default Signup;
