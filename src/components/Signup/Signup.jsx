import React, { useState } from 'react';
import { authService } from '../../services/api';
import './Signup.css';
import { IconEye } from '../common/Icons';
import FormCard from '../common/FormCard';
import FormInput from '../common/FormInput';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      alert("Please enter a valid correspondence email address.");
      return;
    }
    if (formData.password.length < 6) {
      alert("Passphrase must be at least 6 characters long.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      const response = await authService.signup({
        fullName: formData.fullName,
        username: formData.username,
        email: formData.email,
        password: formData.password
      });
      
      alert("Welcome to the registry. Please sign in.");
      onSignupSuccess && onSignupSuccess(response.data);
    } catch (error) {
      alert(error.response?.data?.message || "Registration failed. The ink may have run dry.");
    }
  };

  return (
    <FormCard 
      title="BASIC SIGNUP INFO" 
      subtitle="Vol. XXIV" 
      quote="Knowledge is the only wealth that never decays." 
      author="ANONYMOUS"
      containerClass="auth-container"
    >
      <div className="auth-toggle">
        <button className="toggle-btn" type="button" onClick={onToggle}>Sign In</button>
        <button className="toggle-btn active" type="button">Register</button>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <FormInput
          label="Full Name"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          placeholder="Julian Blackwood"
        />

        <FormInput
          label="Username"
          name="username"
          value={formData.username}
          onChange={handleChange}
          placeholder="j_blackwood"
        />

        <FormInput
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="reader@nocturne.lib"
        />

        <FormInput
          label="Password"
          name="password"
          type={showPassword ? "text" : "password"}
          value={formData.password}
          onChange={handleChange}
          placeholder="••••••••"
        >
          <span 
            className="password-toggle" 
            onClick={() => setShowPassword(!showPassword)}
            style={{ cursor: 'pointer', position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6, display: 'flex', alignItems: 'center' }}
          >
            <IconEye />
          </span>
        </FormInput>

        <FormInput
          label="Confirm Password"
          name="confirmPassword"
          type={showConfirmPassword ? "text" : "password"}
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="••••••••"
        >
          <span 
            className="password-toggle" 
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            style={{ cursor: 'pointer', position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6, display: 'flex', alignItems: 'center' }}
          >
            <IconEye />
          </span>
        </FormInput>

        <div className="checkbox-group">
          <input type="checkbox" className="wax-seal-checkbox" id="terms" required />
          <label htmlFor="terms" className="checkbox-label">
            I agree to the Library's Terms of Silence
          </label>
        </div>

        <button type="submit" className="submit-btn" style={{ marginTop: '1rem' }}>
          JOIN THE REGISTRY
        </button>
      </form>
    </FormCard>
  );
};

export default Signup;
