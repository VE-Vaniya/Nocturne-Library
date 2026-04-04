import React from 'react';

const FormInput = ({ 
  label, 
  name, 
  type = "text", 
  value, 
  onChange, 
  placeholder, 
  required = true, 
  children, // for eye toggle icon etc.
  containerClass = ""
}) => {
  return (
    <div className={`form-group ${containerClass}`}>
      {label && <label className="form-label">{label}</label>}
      <div className="form-input-wrapper">
        <input
          type={type}
          name={name}
          className="form-input"
          value={value}
          onChange={onChange}
          required={required}
          autoComplete="off"
        />
        {!value && placeholder && <span className="custom-placeholder">{placeholder}</span>}
        {children}
      </div>
    </div>
  );
};

export default FormInput;
