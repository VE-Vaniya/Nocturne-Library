import React from 'react';
import { IconSearch } from './Icons';

const SearchBar = ({ 
  placeholder = "Search...", 
  value, 
  onChange, 
  className = "", 
  containerClass = "" 
}) => {
  return (
    <div className={`common-search-bar ${containerClass}`}>
      <IconSearch className="search-icon" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`search-input ${className}`}
        autoComplete="off"
      />
    </div>
  );
};

export default SearchBar;
