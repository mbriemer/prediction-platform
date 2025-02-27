// Server-side code (Node.js with Express)
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const app = express();

// Database models (using Mongoose for MongoDB)
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/prediction-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

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

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'prediction-platform-secret',
  resave: false,
  saveUninitialized: true
}));

// Helper Functions
function calculateCrossEntropy(prediction, lastPrediction) {
  // Convert percentage to probability (0-1 range)
  const p = prediction / 100;
  const q = lastPrediction / 100;
  
  // Cross-entropy formula: -[p*log(q) + (1-p)*log(1-q)]
  // Higher values mean worse prediction (more "surprised")
  // We want to reward better predictions, so we invert this
  
  // Avoid log(0) errors with small epsilon
  const epsilon = 0.0001;
  const crossEntropy = -(
    p * Math.log(q + epsilon) + 
    (1 - p) * Math.log(1 - q + epsilon)
  );
  
  // Scale to a reasonable point value (0-10 range)
  // Lower cross-entropy means better prediction
  return Math.max(0, 10 - crossEntropy);
}

// Routes
// User Authentication
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, isAdmin } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      username,
      password: hashedPassword,
      isAdmin: isAdmin || false
    });
    
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    req.session.userId = user._id;
    req.session.isAdmin = user.isAdmin;
    
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
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logout successful' });
});

// Question Management (Admin Only)
app.post('/api/questions', async (req, res) => {
  try {
    if (!req.session.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { text, R, k, alpha } = req.body;
    
    const question = new Question({
      text,
      parameters: { R, k, alpha }
    });
    
    await question.save();
    res.status(201).json({ message: 'Question created successfully', question });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/questions', async (req, res) => {
  try {
    const questions = await Question.find({ isActive: true });
    res.json(questions);
  } catch (error) {
    res.status(400).json({ error: error.message });
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
      const lastPrediction = predictions[predictions.length - 1].value;
      const k = question.parameters.k;
      const R = question.parameters.R;
      
      // Last k users get R points each
      const lastKIndices = Math.min(k, predictions.length);
      const lastKUserIds = [];
      
      for (let i = 1; i <= lastKIndices; i++) {
        const userIndex = predictions.length - i;
        if (userIndex >= 0) {
          const userId = predictions[userIndex].user;
          lastKUserIds.push(userId);
          await User.findByIdAndUpdate(userId, { $inc: { points: R } });
        }
      }
      
      // Earlier users get points based on cross-entropy
      for (let i = 0; i < predictions.length - lastKIndices; i++) {
        const userId = predictions[i].user;
        if (!lastKUserIds.includes(userId)) {
          const userPrediction = predictions[i].value;
          const points = calculateCrossEntropy(userPrediction, lastPrediction);
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
    res.status(400).json({ error: error.message });
  }
});

// Get user points
app.get('/api/users/points', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Login required' });
    }
    
    const user = await User.findById(req.session.userId);
    res.json({ points: user.points });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const users = await User.find({}).sort({ points: -1 }).limit(10).select('username points');
    res.json(users);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});