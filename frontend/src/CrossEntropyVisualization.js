import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CrossEntropyVisualization = () => {
  const [userPrediction, setUserPrediction] = useState(50);
  const [lastUserPrediction, setLastUserPrediction] = useState(75);
  const [scoreData, setScoreData] = useState([]);
  
  // Calculate cross-entropy between predictions
  const calculateCrossEntropy = (prediction, lastPrediction) => {
    // Convert percentage to probability (0-1 range)
    const p = prediction / 100;
    const q = lastPrediction / 100;
    
    // Cross-entropy formula: -[p*log(q) + (1-p)*log(1-q)]
    const epsilon = 0.0001; // Avoid log(0) errors
    const crossEntropy = -(
      p * Math.log(q + epsilon) + 
      (1 - p) * Math.log(1 - q + epsilon)
    );
    
    // Scale to a reasonable point value (0-10 range)
    return Math.max(0, 10 - crossEntropy);
  };
  
  // Update score data whenever predictions change
  useEffect(() => {
    const data = [];
    for (let i = 1; i <= 99; i += 1) {
      data.push({
        prediction: i,
        score: calculateCrossEntropy(i, lastUserPrediction)
      });
    }
    setScoreData(data);
  }, [lastUserPrediction]);
  
  return (
    <div className="p-4 bg-white rounded shadow">
      <h3 className="mb-4">Cross-Entropy Scoring Explanation</h3>
      
      <div className="mb-4">
        <p>
          In this prediction platform, users earn points based on how close their predictions
          are to the final prediction when a question ends. This uses a scoring system based on cross-entropy.
        </p>
        <p>
          <strong>How it works:</strong> If your prediction is closer to the final prediction, you earn more points.
          The more accurate you are, the higher your score.
        </p>
      </div>
      
      <div className="mb-4">
        <div className="row mb-3">
          <div className="col-md-6">
            <label className="form-label">Your prediction: {userPrediction}%</label>
            <input
              type="range"
              className="form-range"
              min="1"
              max="99"
              value={userPrediction}
              onChange={(e) => setUserPrediction(parseInt(e.target.value))}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Last user's prediction: {lastUserPrediction}%</label>
            <input
              type="range" 
              className="form-range"
              min="1"
              max="99"
              value={lastUserPrediction}
              onChange={(e) => setLastUserPrediction(parseInt(e.target.value))}
            />
          </div>
        </div>
        
        <div className="alert alert-info">
          Your score: <strong>{calculateCrossEntropy(userPrediction, lastUserPrediction).toFixed(2)} points</strong>
        </div>
      </div>
      
      <div className="mb-3">
        <h4>Points by Prediction Value</h4>
        <p>This chart shows how many points you would earn based on different prediction values:</p>
      </div>
      
      <div style={{ height: "300px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={scoreData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="prediction" 
              label={{ value: 'Your Prediction (%)', position: 'insideBottom', offset: -5 }} 
            />
            <YAxis 
              label={{ value: 'Points Earned', angle: -90, position: 'insideLeft' }}
              domain={[0, 10]}
            />
            <Tooltip 
              formatter={(value) => [`${value.toFixed(2)} points`, 'Score']}
              labelFormatter={(value) => `Prediction: ${value}%`}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="score" 
              stroke="#8884d8" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 8 }}
              name="Points"
            />
            {/* Vertical line at the last user's prediction */}
            <Line 
              type="monotone" 
              dataKey={(data) => data.prediction === lastUserPrediction ? 10 : null} 
              stroke="red" 
              strokeWidth={2}
              dot={false}
              name="Last User's Prediction"
            />
            {/* Vertical line at the current user's prediction */}
            <Line 
              type="monotone" 
              dataKey={(data) => data.prediction === userPrediction ? 10 : null} 
              stroke="green" 
              strokeWidth={2}
              dot={false}
              name="Your Prediction"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4">
        <h4>Additional Rules</h4>
        <ul className="list-group">
          <li className="list-group-item">After each prediction, there's a chance (alpha) that the question ends</li>
          <li className="list-group-item">If the question ends, the last k users get R points each</li>
          <li className="list-group-item">All other users get points based on how close their predictions were to the last user's prediction</li>
        </ul>
      </div>
    </div>
  );
};

export default CrossEntropyVisualization;