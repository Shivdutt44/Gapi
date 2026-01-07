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
    const { query, key, pagetoken, type } = req.query;
    const apiKey = key || GOOGLE_API_KEY;
    
    if (!apiKey || apiKey === 'YOUR_API_KEY') {
      return res.status(400).json({ 
        error: 'Google API key is required. Set GOOGLE_API_KEY env variable or pass ?key=YOUR_KEY' 
      });
    }
    
    // Define all place types to search when "all" is selected
    const allTypes = [
      'restaurants', 'cafes', 'hotels', 'hospitals', 'banks', 
      'gas stations', 'shopping malls', 'parks', 'gyms', 
      'schools', 'pharmacies', 'bars', 'beaches', 'museums', 'airports'
    ];
    
    let googleUrl;
    if (pagetoken) {
      // Use pagetoken for next page of results
      googleUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${encodeURIComponent(pagetoken)}&key=${apiKey}`;
    } else if (type === 'all') {
      // First, geocode the location to get coordinates
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`;
      const geocodeResponse = await fetch(geocodeUrl);
      const geocodeData = await geocodeResponse.json();
      
      if (!geocodeData.results || geocodeData.results.length === 0) {
        return res.status(400).json({ error: 'Could not find location' });
      }
      
      const location = geocodeData.results[0].geometry.location;
      
      // Search for all place types using nearby search and combine results
      const promises = allTypes.map(t => 
        fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.lat},${location.lng}&radius=50000&type=${t}&key=${apiKey}`)
          .then(res => res.json())
          .catch(() => ({ results: [] }))
      );
      
      const allResults = await Promise.all(promises);
      
      // Combine and deduplicate results by place_id
      const combinedResults = [];
      const seenIds = new Set();
      
      for (const result of allResults) {
        if (result.results) {
          for (const place of result.results) {
            if (!seenIds.has(place.place_id)) {
              seenIds.add(place.place_id);
              combinedResults.push(place);
            }
          }
        }
      }
      
      // Shuffle results for variety
      const shuffledResults = combinedResults.sort(() => Math.random() - 0.5);
      
      return res.json({ results: shuffledResults });
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
