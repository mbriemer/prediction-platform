const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// ===== DATABASE CONNECTION =====
// Connect to MongoDB with proper error handling - this MUST be before defining models
console.log('Connecting to MongoDB...');
mongoose.connect('mongodb://127.0.0.1:27017/prediction-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000 // Shorter timeout for faster feedback
})
.then(() => {
  console.log('Connected to MongoDB successfully');
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  console.log('Please make sure MongoDB is running at mongodb://127.0.0.1:27017');
  // Don't exit, let's use memory store as fallback
  console.log('Falling back to in-memory storage for development');
  useMemoryStore = true;
});

// ===== MODELS =====
// User Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  points: { type: Number, default: 0 }
});

// Question Schema
const QuestionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  parameters: {
    R: { type: Number, required: true }, // Points for last k users
    k: { type: Number, required: true }, // Number of users to get R points
    alpha: { type: Number, required: true } // Probability of ending after each prediction
  },
  predictions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    value: { type: Number, min: 1, max: 99 },
    timestamp: { type: Date, default: Date.now }
  }],
  completed: { type: Boolean, default: false }
});

const User = mongoose.model('User', UserSchema);
const Question = mongoose.model('Question', QuestionSchema);

// ===== MIDDLEWARE =====
// Enable CORS for development
app.use(cors({
  origin: 'http://localhost:3001', // Your React app's address
  credentials: true // Allow cookies to be sent
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: 'prediction-platform-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Helper Functions
function calculateCrossEntropy(agentPrediction, marketPrediction, referencePrediction = 0.5) {
  // Convert percentages to probabilities (0-1 range)
  const q_t = agentPrediction / 100;
  const q_t_minus_1 = marketPrediction / 100;
  const r = referencePrediction;
  
  // Avoid log(0) errors with small epsilon
  const epsilon = 0.0001;
  
  // For binary prediction, we need to handle both outcomes
  // S_CEM(r, q^(t), q^(t-1)) = -H(r, q^(t)) + H(r, q^(t-1)) = Σ_i r_i log(q_i^(t)/q_i^(t-1))
  
  // For i=1 (the event happens with probability r)
  const term1 = r * Math.log((q_t + epsilon) / (q_t_minus_1 + epsilon));
  
  // For i=0 (the event doesn't happen with probability 1-r)
  const term2 = (1 - r) * Math.log(((1 - q_t) + epsilon) / ((1 - q_t_minus_1) + epsilon));
  
  // Sum both terms
  return term1 + term2;
}

// ===== ROUTES =====
// User Authentication
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Registration attempt for:', username);
    
    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      username,
      password: hashedPassword,
      isAdmin: false // Force isAdmin to always be false, ignoring the request body
    });
    
    await user.save();
    console.log('User registered successfully:', username);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Login attempt for:', username);
    
    const user = await User.findOne({ username });
    
    if (!user) {
      console.log('User not found:', username);
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log('Invalid password for user:', username);
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    req.session.userId = user._id;
    req.session.isAdmin = user.isAdmin;
    req.session.username = user.username;
    
    console.log('Login successful for:', username);
    console.log('Session ID:', req.session.id);
    
    res.json({ 
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        isAdmin: user.isAdmin,
        points: user.points
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

app.post('/api/logout', (req, res) => {
  console.log('Logout for session:', req.session.id);
  req.session.destroy();
  res.json({ message: 'Logout successful' });
});

// Question Management (Admin Only)
app.post('/api/questions', async (req, res) => {
  try {
    if (!req.session.userId || !req.session.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { text, R, k, alpha } = req.body;
    console.log('Creating question:', text);
    
    const question = new Question({
      text,
      parameters: { R, k, alpha }
    });
    
    await question.save();
    console.log('Question created successfully');
    res.status(201).json({ message: 'Question created successfully', question });
  } catch (error) {
    console.error('Question creation error:', error);
    res.status(500).json({ error: 'Internal server error creating question' });
  }
});

app.get('/api/questions', async (req, res) => {
  try {
    console.log('Fetching all questions');
    const questions = await Question.find({ isActive: true });
    
    // If user is logged in, check which questions they've predicted on
    if (req.session.userId) {
      // Create a simple array to send to the client
      const questionsWithUserData = await Promise.all(questions.map(async (question) => {
        // Convert to plain object
        const plainQuestion = question.toObject();
        
        // Check if user has predicted on this question
        const hasPredicted = question.predictions.some(
          pred => pred.user && pred.user.toString() === req.session.userId.toString()
        );
        
        // Add flag directly to the object
        plainQuestion.userHasPredicted = hasPredicted;
        
        return plainQuestion;
      }));
      
      res.json(questionsWithUserData);
    } else {
      res.json(questions);
    }
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Internal server error fetching questions' });
  }
});

// Get question details
app.get('/api/questions/:id', async (req, res) => {
  try {
    console.log('Fetching question details for ID:', req.params.id);
    const question = await Question.findById(req.params.id)
      .populate('predictions.user', 'username');
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    res.json(question);
  } catch (error) {
    console.error('Error fetching question details:', error);
    res.status(500).json({ error: 'Internal server error fetching question details' });
  }
});

// Get prediction results with points
app.get('/api/questions/:id/results', async (req, res) => {
  try {
    console.log('Fetching results for question ID:', req.params.id);
    const question = await Question.findById(req.params.id)
      .populate('predictions.user', 'username');
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    if (!question.completed) {
      return res.status(400).json({ error: 'Question is not completed yet' });
    }
    
    // Calculate points for each prediction
    const predictions = question.predictions;
    const lastPrediction = predictions[predictions.length - 1].value;
    const k = question.parameters.k;
    const R = question.parameters.R;
    
    // Identify the last k users
    const lastKIndices = Math.min(k, predictions.length);
    const lastKUserIds = [];
    
    for (let i = 1; i <= lastKIndices; i++) {
      const userIndex = predictions.length - i;
      if (userIndex >= 0) {
        lastKUserIds.push(predictions[userIndex].user._id.toString());
      }
    }
    
    // Calculate points for all predictions
    const results = predictions.map((pred, index) => {
      const userId = pred.user._id.toString();
      let points = 0;
      let reason = '';
      
      if (lastKUserIds.includes(userId)) {
        points = R;
        reason = `Last ${k} users bonus`;
      } else {
        points = calculateCrossEntropy(pred.value, lastPrediction);
        reason = 'Cross-entropy score';
      }
      
      return {
        username: pred.user.username,
        prediction: pred.value,
        timestamp: pred.timestamp,
        points: points,
        reason: reason
      };
    });
    
    res.json({
      question: question.text,
      completed: true,
      finalPrediction: lastPrediction,
      results: results
    });
  } catch (error) {
    console.error('Error fetching question results:', error);
    res.status(500).json({ error: 'Internal server error fetching question results' });
  }
});

// User Predictions
app.post('/api/questions/:id/predict', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Login required' });
    }
    
    const { value } = req.body;
    const prediction = parseInt(value);
    
    if (isNaN(prediction) || prediction < 1 || prediction > 99) {
      return res.status(400).json({ error: 'Prediction must be between 1 and 99' });
    }
    
    const question = await Question.findById(req.params.id);
    
    if (!question || !question.isActive || question.completed) {
      return res.status(400).json({ error: 'Question is not active' });
    }
    
    // Check if user has already made a prediction for this question
    const existingPrediction = question.predictions.find(
      pred => pred.user.toString() === req.session.userId.toString()
    );
    
    if (existingPrediction) {
      return res.status(400).json({ error: 'You have already made a prediction for this question' });
    }
    
    // Add the prediction
    question.predictions.push({
      user: req.session.userId,
      value: prediction
    });
    
    // Check if question should end based on alpha probability
    const shouldEnd = Math.random() < question.parameters.alpha;
    
    if (shouldEnd || question.predictions.length >= 100) { // Also end if too many predictions
      question.completed = true;
      
      // Distribute points to users
      const predictions = question.predictions;
      const k = question.parameters.k;
      const R = question.parameters.R;
      
      // Only the last k users get R points
      const totalPredictions = predictions.length;
      const lastKUserIds = [];
      
      for (let i = 0; i < k && i < totalPredictions; i++) {
        const userIndex = totalPredictions - 1 - i;
        if (userIndex >= 0) {
          const userId = predictions[userIndex].user;
          lastKUserIds.push(userId.toString()); // Convert ObjectId to string for comparison
          await User.findByIdAndUpdate(userId, { $inc: { points: R } });
        }
      }
      
      // Earlier users get points based on CE-MSR
      for (let i = 0; i < totalPredictions - k; i++) {
        const userId = predictions[i].user;
        const userIdStr = userId.toString(); // Convert ObjectId to string
        
        // Ensure this user is not in the last k users
        if (!lastKUserIds.includes(userIdStr)) {
          const agentPrediction = predictions[i].value;
          const marketPrediction = i > 0 ? predictions[i-1].value : 50; // Use 50 as initial prediction
          const referencePrediction = 0.5; // Default reference prediction
          
          const points = calculateCrossEntropy(agentPrediction, marketPrediction, referencePrediction);
          await User.findByIdAndUpdate(userId, { $inc: { points: points } });
        }
      }
    }
    
    await question.save();
    
    res.json({ 
      message: 'Prediction submitted successfully',
      completed: question.completed
    });
  } catch (error) {
    console.error('Error submitting prediction:', error);
    res.status(500).json({ error: 'Internal server error submitting prediction' });
  }
});

// Get user points
app.get('/api/users/points', async (req, res) => {
  try {
    if (!req.session.userId) {
      console.log('No user session found');
      return res.status(401).json({ error: 'Login required' });
    }
    
    console.log('Fetching points for user ID:', req.session.userId);
    
    const user = await User.findById(req.session.userId);
    
    if (!user) {
      console.log('User not found for ID:', req.session.userId);
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ 
      points: user.points,
      username: user.username,
      isAdmin: user.isAdmin
    });
  } catch (error) {
    console.error('Error fetching user points:', error);
    res.status(500).json({ error: 'Internal server error fetching user points' });
  }
});

// Get leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    console.log('Fetching leaderboard');
    const users = await User.find({}).sort({ points: -1 }).limit(10).select('username points');
    res.json(users);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Internal server error fetching leaderboard' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});