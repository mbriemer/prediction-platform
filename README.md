An implementation of a self-resolving prediction platform as described in [Self-Resolving Prediction Markets for Unverifiable Outcomes](https://arxiv.org/abs/2306.04305) by Srinivasan, Karger, and Chen.

# Setup

## Prerequisites
- Node.js
- MongoDB

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/prediction-platform.git
   cd prediction-platform
   ```

2. Install dependencies:
   ```
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

3. Start MongoDB:
   ```
   mongod
   ```

4. Start the servers:
   ```
   # Backend (from backend directory)
   npm start

   # Frontend (from frontend directory, in a separate terminal)
   npm start
   ```

5. Access the application at http://localhost:3001

## Configuration

Questions have three key parameters:
- **R**: Points awarded to last k users
- **k**: Number of users who receive R points
- **alpha**: Probability of question ending after each prediction