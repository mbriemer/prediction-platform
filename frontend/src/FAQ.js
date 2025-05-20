// Update your FAQ.js file to use the native HTML details/summary elements
import React from 'react';
import { Link } from 'react-router-dom';

// Add some basic styling for the details elements
const detailsStyle = {
  marginBottom: '1rem',
  padding: '1rem',
  borderRadius: '0.25rem',
  border: '1px solid #dee2e6',
  backgroundColor: '#f8f9fa'
};

const summaryStyle = {
  fontWeight: 'bold',
  fontSize: '1.1rem',
  padding: '0.5rem',
  cursor: 'pointer'
};

function FAQ() {
  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Frequently Asked Questions</h1>
        <Link to="/" className="btn btn-secondary">Back to Home</Link>
      </div>
      
      <details style={detailsStyle} open>
        <summary style={summaryStyle}>How does this prediction platform work?</summary>
        <div className="mt-3">
          <p>This platform allows users to make probabilistic predictions on questions. Each question has a chance of resolving after every prediction.</p>
          <p>Users enter predictions as percentages (1-99%) indicating their belief in the likelihood of the outcome.</p>
          <p>After each prediction, there's a random chance (alpha) that the question will end.</p>
        </div>
      </details>
      
      <details style={detailsStyle}>
        <summary style={summaryStyle}>How are points awarded?</summary>
        <div className="mt-3">
          <p>Points are awarded through two mechanisms:</p>
          <ol>
            <li><strong>Last K Users Bonus:</strong> The last k users who make predictions before a question resolves receive R bonus points each.</li>
            <li><strong>Cross-Entropy Market Scoring Rule (CE-MSR):</strong> Earlier users are scored based on how their prediction compares to the previous prediction using a cross-entropy formula:</li>
          </ol>
          <div className="card p-3 mb-3 bg-light">
            <p className="text-center">
              S(r, q<sup>(t)</sup>, q<sup>(t-1)</sup>) = -H(r, q<sup>(t)</sup>) + H(r, q<sup>(t-1)</sup>) = Σ<sub>i</sub> r<sub>i</sub> log(q<sub>i</sub><sup>(t)</sup>/q<sub>i</sub><sup>(t-1)</sup>)
            </p>
          </div>
          <p>This formula rewards users whose predictions move the consensus in the right direction.</p>
        </div>
      </details>
      
      <details style={detailsStyle}>
        <summary style={summaryStyle}>What do the parameters R, k, and alpha mean?</summary>
        <div className="mt-3">
          <ul>
            <li><strong>R:</strong> The number of bonus points awarded to the last k users who make predictions before a question resolves.</li>
            <li><strong>k:</strong> The number of users who receive the R bonus points when a question resolves.</li>
            <li><strong>alpha (α):</strong> The probability that the question will end after each prediction. A higher alpha means questions are likely to resolve more quickly.</li>
          </ul>
        </div>
      </details>
      
      <details style={detailsStyle}>
        <summary style={summaryStyle}>Can I change my prediction after submitting it?</summary>
        <div className="mt-3">
          <p>No, each user can only make one prediction per question. Once you've submitted a prediction, it cannot be changed.</p>
          <p>This ensures that all predictions are honest assessments of probability at the moment they are made.</p>
        </div>
      </details>
      
      <details style={detailsStyle}>
        <summary style={summaryStyle}>How is this platform different from traditional prediction markets?</summary>
        <div className="mt-3">
          <p>This platform is self-resolving, meaning it doesn't require a real-world event to determine the outcome. The market itself determines when a question resolves through the random alpha mechanism.</p>
          <p>This approach is based on academic research in market design and allows for prediction markets on questions that might be difficult or impossible to verify objectively.</p>
          <p>The scoring system rewards both accurate forecasting and being among the last participants to predict before resolution.</p>
        </div>
      </details>
    </div>
  );
}

export default FAQ;