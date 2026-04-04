import React, { useState } from 'react';
import './Login.css';
import { IconEye } from '../common/Icons';
import FormCard from '../common/FormCard';
import FormInput from '../common/FormInput';

const Login = ({ onToggle, onLoginSuccess, users = [] }) => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);

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
        <FormCard 
            title="READER'S CARD" 
            subtitle="No. 1367" 
            quote="In books lies the soul of the whole past time." 
            author="THOMAS CARLYLE"
            headerIcon="✎"
            containerClass="auth-container"
        >
            <div className="auth-toggle">
                <button className="toggle-btn active" type="button">Sign In</button>
                <button className="toggle-btn" type="button" onClick={onToggle}>Register</button>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
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

                <button type="submit" className="submit-btn" style={{ marginTop: '1rem' }}>
                    ENTER THE LIBRARY
                </button>
            </form>
        </FormCard>
    );
};

export default Login;
