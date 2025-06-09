import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

export default function Home() {
  return (
    <div className="home-hero">
      <div className="overlay" />
      <div className="hero-content">
        <h1>CSV File Manager</h1>
        <p>Your data, anywhere. Collaborate & manage with ease.</p>
        <div className="cta-buttons">
          <Link to="/login" className="btn btn-login">Login</Link>
          <Link to="/signup" className="btn btn-signup">Sign Up</Link>
        </div>
      </div>
    </div>
  );
}
