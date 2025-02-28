// Frontend code (React)
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

// Set up axios defaults
axios.defaults.withCredentials = true;

// Question Detail Page
function QuestionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [question, setQuestion] = useState(null);
  const [prediction, setPrediction] = useState(50);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    // Check if user is logged in
    const checkLoginStatus = async () => {
      try {
        const response = await axios.get('/api/users/points');
        if (response.data) {
          setUser(response.data);
        }
      } catch (error) {
        navigate('/'); // Redirect to home if not logged in
      }
    };
    
    checkLoginStatus();
    
    // Fetch question details
    const fetchQuestionDetails = async () => {
      try {
        const response = await axios.get(`/api/questions/${id}`);
        setQuestion(response.data);
        
        if (response.data.completed) {
          try {
            const resultsResponse = await axios.get(`/api/questions/${id}/results`);
            setResults(resultsResponse.data);
          } catch (err) {
            console.error('Error fetching results:', err);
          }
        }
      } catch (err) {
        setError('Question not found or you are not authorized to view it');
        console.error('Error fetching question:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuestionDetails();
  }, [id, navigate]);
  
  const handleSubmitPrediction = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.post(`/api/questions/${id}/predict`, {
        value: prediction
      });
      
      if (response.data.completed) {
        alert('Your prediction was submitted and the question has ended! Points have been distributed.');
        // Refresh to show results
        window.location.reload();
      } else {
        alert('Your prediction was submitted successfully!');
        // Refresh to show updated predictions
        const questionResponse = await axios.get(`/api/questions/${id}`);
        setQuestion(questionResponse.data);
      }
    } catch (error) {
      alert('Failed to submit prediction: ' + error.response?.data?.error || 'Unknown error');
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/logout');
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };
  
  if (loading) return <div className="container mt-5"><p>Loading question details...</p></div>;
  if (error) return <div className="container mt-5"><p className="text-danger">{error}</p></div>;
  if (!question) return <div className="container mt-5"><p>Question not found</p></div>;
  
  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <Link to="/" className="btn btn-secondary">← Back to All Questions</Link>
        {user && (
          <div>
            <span className="me-3">Points: {user.points}</span>
            <button onClick={handleLogout} className="btn btn-outline-secondary btn-sm">Logout</button>
          </div>
        )}
      </div>
      
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h2>{question.text}</h2>
          <span className={`badge ${question.completed ? 'bg-secondary' : 'bg-success'}`}>
            {question.completed ? 'Completed' : 'Active'}
          </span>
        </div>
        <div className="card-body">
          <div className="mb-3">
            <h5>Parameters:</h5>
            <ul>
              <li><strong>R:</strong> {question.parameters.R} points (awarded to last {question.parameters.k} users)</li>
              <li><strong>k:</strong> {question.parameters.k} users (number of users who get R points)</li>
              <li><strong>α:</strong> {question.parameters.alpha} (probability question ends after each prediction)</li>
            </ul>
          </div>
          
          {!question.completed && (
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
          
          <h4>Predictions</h4>
          {question.predictions.length === 0 ? (
            <p>No predictions yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>User</th>
                    <th>Prediction</th>
                    <th>Timestamp</th>
                    {results && <th>Points</th>}
                    {results && <th>Reason</th>}
                  </tr>
                </thead>
                <tbody>
                  {results ? (
                    results.results.map((result, index) => (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td>{result.username}</td>
                        <td>{result.prediction}%</td>
                        <td>{new Date(result.timestamp).toLocaleString()}</td>
                        <td>{result.points.toFixed(2)}</td>
                        <td>{result.reason}</td>
                      </tr>
                    ))
                  ) : (
                    question.predictions.map((pred, index) => (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td>{pred.user.username}</td>
                        <td>{pred.value}%</td>
                        <td>{new Date(pred.timestamp).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          
          {question.completed && results && (
            <div className="alert alert-info mt-4">
              <h5>Question Completed</h5>
              <p>Final prediction value: <strong>{results.finalPrediction}%</strong></p>
              <p>Points have been distributed to all participants.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Home Page
function Home() {
  const navigate = useNavigate();
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

  const viewQuestionDetails = (id) => {
    navigate(`/questions/${id}`);
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
                    <div 
                      key={question._id}
                      className="list-group-item"
                    >
                      <div className="d-flex w-100 justify-content-between">
                        <h5 className="mb-1">{question.text}</h5>
                        <small>{question.predictions.length} predictions</small>
                      </div>
                      <p className="mb-1">
                        Parameters: R={question.parameters.R}, k={question.parameters.k}, α={question.parameters.alpha}
                      </p>
                      <div className="d-flex justify-content-between align-items-center mt-2">
                        {question.completed ? 
                          <span className="badge bg-secondary">Completed</span> : 
                          <span className="badge bg-success">Active</span>
                        }
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => viewQuestionDetails(question._id)}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
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

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/questions/:id" element={<QuestionDetail />} />
      </Routes>
    </Router>
  );
}

export default App;