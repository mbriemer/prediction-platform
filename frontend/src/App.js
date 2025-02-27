// Frontend code (React)
import React, { useState, useEffect } from 'react';
import axios from 'axios';
//import CrossEntropyVisualization from './CrossEntropyVisualization';

// Set up axios defaults
axios.defaults.withCredentials = true;

function App() {
  const [user, setUser] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Registration form state
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Question creation form state
  const [questionText, setQuestionText] = useState('');
  const [rValue, setRValue] = useState(10);
  const [kValue, setKValue] = useState(3);
  const [alphaValue, setAlphaValue] = useState(0.2);
  
  // Prediction form state
  const [prediction, setPrediction] = useState(50);
  const [selectedQuestion, setSelectedQuestion] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const checkLoginStatus = async () => {
      try {
        const response = await axios.get('/api/users/points');
        if (response.data) {
          // User is logged in
          setUser(response.data);
          fetchQuestions();
          fetchLeaderboard();
        }
      } catch (error) {
        // Not logged in, that's okay
        console.log('Not logged in');
      } finally {
        setLoading(false);
      }
    };
    
    checkLoginStatus();
  }, []);

  const fetchQuestions = async () => {
    try {
      const response = await axios.get('/api/questions');
      setQuestions(response.data);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get('/api/leaderboard');
      setLeaderboard(response.data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/login', { username, password });
      setUser(response.data.user);
      fetchQuestions();
      fetchLeaderboard();
      setUsername('');
      setPassword('');
    } catch (error) {
      alert('Login failed: ' + error.response?.data?.error || 'Unknown error');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/register', { 
        username: regUsername, 
        password: regPassword,
        isAdmin
      });
      alert('Registration successful! You can now log in.');
      setRegUsername('');
      setRegPassword('');
      setIsAdmin(false);
    } catch (error) {
      alert('Registration failed: ' + error.response?.data?.error || 'Unknown error');
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/logout');
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/questions', {
        text: questionText,
        R: rValue,
        k: kValue,
        alpha: alphaValue
      });
      alert('Question created successfully!');
      setQuestionText('');
      fetchQuestions();
    } catch (error) {
      alert('Failed to create question: ' + error.response?.data?.error || 'Unknown error');
    }
  };

  const handleSubmitPrediction = async (e) => {
    e.preventDefault();
    if (!selectedQuestion) return;
    
    try {
      const response = await axios.post(`/api/questions/${selectedQuestion}/predict`, {
        value: prediction
      });
      
      if (response.data.completed) {
        alert('Your prediction was submitted and the question has ended! Points have been distributed.');
      } else {
        alert('Your prediction was submitted successfully!');
      }
      
      fetchQuestions();
      fetchLeaderboard();
      setPrediction(50);
      setSelectedQuestion(null);
    } catch (error) {
      alert('Failed to submit prediction: ' + error.response?.data?.error || 'Unknown error');
    }
  };

  if (loading) {
    return <div className="container mt-5"><p>Loading...</p></div>;
  }

  return (
    <div className="container mt-5">
      <h1>Prediction Platform</h1>
      
      {!user ? (
        <div className="row">
          <div className="col-md-6">
            <h2>Login</h2>
            <form onSubmit={handleLogin}>
              <div className="mb-3">
                <label className="form-label">Username</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  required 
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-control" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
              </div>
              <button type="submit" className="btn btn-primary">Login</button>
            </form>
          </div>
          
          <div className="col-md-6">
            <h2>Register</h2>
            <form onSubmit={handleRegister}>
              <div className="mb-3">
                <label className="form-label">Username</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={regUsername} 
                  onChange={(e) => setRegUsername(e.target.value)} 
                  required 
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-control" 
                  value={regPassword} 
                  onChange={(e) => setRegPassword(e.target.value)} 
                  required 
                />
              </div>
              <div className="mb-3 form-check">
                <input 
                  type="checkbox" 
                  className="form-check-input" 
                  id="isAdmin"
                  checked={isAdmin}
                  onChange={(e) => setIsAdmin(e.target.checked)} 
                />
                <label className="form-check-label" htmlFor="isAdmin">Register as Admin</label>
              </div>
              <button type="submit" className="btn btn-success">Register</button>
            </form>
          </div>
        </div>
      ) : (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>Welcome, {user.username}!</h2>
            <div>
              <span className="me-3">Points: {user.points}</span>
              <button onClick={handleLogout} className="btn btn-secondary">Logout</button>
            </div>
          </div>
          
          {user.isAdmin && (
            <div className="card mb-4">
              <div className="card-header">
                <h3>Create New Question (Admin)</h3>
              </div>
              <div className="card-body">
                <form onSubmit={handleCreateQuestion}>
                  <div className="mb-3">
                    <label className="form-label">Question Text</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={questionText} 
                      onChange={(e) => setQuestionText(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label">R (Points for last k users)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={rValue} 
                        onChange={(e) => setRValue(Number(e.target.value))} 
                        min="1"
                        required 
                      />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">k (Number of users to reward)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={kValue} 
                        onChange={(e) => setKValue(Number(e.target.value))} 
                        min="1"
                        required 
                      />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Alpha (End probability)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={alphaValue} 
                        onChange={(e) => setAlphaValue(Number(e.target.value))} 
                        min="0.01"
                        max="0.99"
                        step="0.01"
                        required 
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary">Create Question</button>
                </form>
              </div>
            </div>
          )}
          
          <div className="row">
            <div className="col-md-7">
              <h3>Active Questions</h3>
              {questions.length === 0 ? (
                <p>No active questions available.</p>
              ) : (
                <div className="list-group mb-4">
                  {questions.map(question => (
                    <button 
                      key={question._id}
                      className={`list-group-item list-group-item-action ${selectedQuestion === question._id ? 'active' : ''}`}
                      onClick={() => setSelectedQuestion(question._id)}
                      disabled={question.completed}
                    >
                      <div className="d-flex w-100 justify-content-between">
                        <h5 className="mb-1">{question.text}</h5>
                        <small>{question.predictions.length} predictions</small>
                      </div>
                      <p className="mb-1">
                        Parameters: R={question.parameters.R}, k={question.parameters.k}, α={question.parameters.alpha}
                      </p>
                      {question.completed && <span className="badge bg-secondary">Completed</span>}
                    </button>
                  ))}
                </div>
              )}
              
              {selectedQuestion && (
                <div className="card mb-4">
                  <div className="card-header">
                    <h4>Make a Prediction</h4>
                  </div>
                  <div className="card-body">
                    <form onSubmit={handleSubmitPrediction}>
                      <div className="mb-3">
                        <label className="form-label">Your prediction (1-99%)</label>
                        <input 
                          type="range" 
                          className="form-range" 
                          min="1" 
                          max="99" 
                          value={prediction} 
                          onChange={(e) => setPrediction(Number(e.target.value))} 
                        />
                        <div className="text-center">
                          <strong>{prediction}%</strong>
                        </div>
                      </div>
                      <button type="submit" className="btn btn-success">Submit Prediction</button>
                    </form>
                  </div>
                </div>
              )}
            </div>
            
            <div className="col-md-5">
              <h3>Leaderboard</h3>
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>User</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((user, index) => (
                    <tr key={user._id}>
                      <td>{index + 1}</td>
                      <td>{user.username}</td>
                      <td>{user.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;