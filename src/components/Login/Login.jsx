import React, { useState } from 'react';
import './Login.css';

const Login = ({ onToggle, onLoginSuccess, users = [] }) => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            alert("Please enter a valid correspondence email address.");
            return;
        }
        if (formData.password.length < 6) {
            alert("Security dictates passphrases must be at least 6 characters.");
            return;
        }

        const foundUser = users.find(u => u.email === formData.email && u.password === formData.password);
        
        if (foundUser) {
            onLoginSuccess && onLoginSuccess(foundUser);
        } else {
            alert("Invalid credentials. Please ensure you have signed up.");
        }
    };

    return (
        <div className="auth-container">
            <div className="card-header">
                <span>✎ READER'S CARD</span>
                <span>No. 1367</span>
            </div>

            <div className="auth-toggle">
                <button className="toggle-btn active" type="button">Sign In</button>
                <button className="toggle-btn" type="button" onClick={onToggle}>Register</button>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label">Email</label>
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
                            type="password"
                            name="password"
                            className="form-input"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                        {!formData.password && <span className="custom-placeholder">••••••••</span>}
                    </div>
                </div>

                <button type="submit" className="submit-btn">
                    ENTER THE LIBRARY
                </button>
            </form>

            <div className="quote-section">
                <span className="quote-text">"In books lies the soul of the whole past time."</span>
                <span className="quote-author">— THOMAS CARLYLE</span>
            </div>
        </div>
    );
};

export default Login;
