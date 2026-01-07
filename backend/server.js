import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'AIzaSyDq3eLU5UMm5kKZNvwyofR0bC3rMToQ-hw';

// Middleware
app.use(cors());
app.use(express.json());

// Sample API endpoints
app.get('/api', (req, res) => {
  res.json({
    message: 'Gapi Backend API',
    endpoints: {
      health: '/api/health',
      places: '/api/places?query=your_search'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend server is running' });
});

// Google Places API endpoint
app.get('/api/places', async (req, res) => {
  try {
    const { query, key, pagetoken } = req.query;
    const apiKey = key || GOOGLE_API_KEY;
    
    if (!apiKey || apiKey === 'YOUR_API_KEY') {
      return res.status(400).json({ 
        error: 'Google API key is required. Set GOOGLE_API_KEY env variable or pass ?key=YOUR_KEY' 
      });
    }
    
    let googleUrl;
    if (pagetoken) {
      // Use pagetoken for next page of results
      googleUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${encodeURIComponent(pagetoken)}&key=${apiKey}`;
    } else {
      googleUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
    }
    
    const response = await fetch(googleUrl);
    const data = await response.json();
    
    res.json(data);
  } catch (error) {
    console.error('Error calling Google Places API:', error);
    res.status(500).json({ error: 'Failed to fetch places data' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});
