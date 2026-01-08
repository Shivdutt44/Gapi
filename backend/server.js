import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

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
    const { query, key, pagetoken, type, radius, page } = req.query;
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
    
    // Progressive search parameters
    const searchRadius = parseInt(radius) || 50000; // Default 50km
    const searchPage = parseInt(page) || 0;
    const maxRadius = 500000; // Max 500km for progressive search
    
    let googleUrl;
    
    // Check if this is a progressive search (has page parameter)
    if (searchPage > 0) {
      // Progressive search - calculate new center based on page number
      // Create a grid pattern around the original location
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`;
      const geocodeResponse = await fetch(geocodeUrl);
      const geocodeData = await geocodeResponse.json();
      
      if (!geocodeData.results || geocodeData.results.length === 0) {
        return res.status(400).json({ error: 'Could not find location' });
      }
      
      const baseLocation = geocodeData.results[0].geometry.location;
      
      // Calculate offset for grid pattern (roughly 50km apart)
      const latOffset = 0.45; // ~50km at equator
      const lngOffset = 0.45 / Math.cos(baseLocation.lat * Math.PI / 180);
      
      // Calculate new center based on page number (spiral/grid pattern)
      const pageIndex = searchPage - 1;
      const ring = Math.floor(Math.sqrt(pageIndex));
      const position = pageIndex - ring * ring;
      
      // Distribute positions in a grid pattern
      let offsetLat = 0;
      let offsetLng = 0;
      
      if (ring > 0) {
        const positions = 8 * ring;
        if (position < positions) {
          const quadrant = Math.floor(position / ring);
          const step = position % ring;
          const distance = (step + 1) * latOffset;
          
          switch(quadrant % 8) {
            case 0: offsetLat = distance; break;
            case 1: offsetLat = distance; offsetLng = ring * lngOffset; break;
            case 2: offsetLng = ring * lngOffset; break;
            case 3: offsetLat = -distance; offsetLng = ring * lngOffset; break;
            case 4: offsetLat = -distance; break;
            case 5: offsetLat = -distance; offsetLng = -ring * lngOffset; break;
            case 6: offsetLng = -ring * lngOffset; break;
            case 7: offsetLat = distance; offsetLng = -ring * lngOffset; break;
          }
        }
      }
      
      const newLat = baseLocation.lat + offsetLat;
      const newLng = baseLocation.lng + offsetLng;
      
      // Search for all place types in the new area
      const promises = allTypes.map(t => 
        fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${newLat},${newLng}&radius=${searchRadius}&type=${t}&key=${apiKey}`)
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
      
      // Determine if we should continue searching
      const nextRadius = searchRadius < maxRadius ? Math.min(searchRadius * 2, maxRadius) : searchRadius;
      const hasMore = shuffledResults.length > 0 && searchRadius < maxRadius;
      
      return res.json({ 
        results: shuffledResults,
        next_page_token: hasMore ? `page_${searchPage + 1}_radius_${nextRadius}` : null,
        search_info: {
          page: searchPage,
          radius: searchRadius,
          location: { lat: newLat, lng: newLng }
        }
      });
    } else if (pagetoken && pagetoken.startsWith('page_')) {
      // Parse the custom token for progressive search
      const tokenMatch = pagetoken.match(/page_(\d+)_radius_(\d+)/);
      if (tokenMatch) {
        const nextPage = parseInt(tokenMatch[1]);
        const nextRadius = parseInt(tokenMatch[2]);
        
        // Recursive call with page and radius parameters - directly make the call
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`;
        const geocodeResponse = await fetch(geocodeUrl);
        const geocodeData = await geocodeResponse.json();
        
        if (!geocodeData.results || geocodeData.results.length === 0) {
          return res.status(400).json({ error: 'Could not find location' });
        }
        
        const baseLocation = geocodeData.results[0].geometry.location;
        
        // Calculate offset for grid pattern
        const latOffset = 0.45;
        const lngOffset = 0.45 / Math.cos(baseLocation.lat * Math.PI / 180);
        
        const pageIndex = nextPage - 1;
        const ring = Math.floor(Math.sqrt(pageIndex));
        const position = pageIndex - ring * ring;
        
        let offsetLat = 0;
        let offsetLng = 0;
        
        if (ring > 0) {
          const positions = 8 * ring;
          if (position < positions) {
            const quadrant = Math.floor(position / ring);
            const step = position % ring;
            const distance = (step + 1) * latOffset;
            
            switch(quadrant % 8) {
              case 0: offsetLat = distance; break;
              case 1: offsetLat = distance; offsetLng = ring * lngOffset; break;
              case 2: offsetLng = ring * lngOffset; break;
              case 3: offsetLat = -distance; offsetLng = ring * lngOffset; break;
              case 4: offsetLat = -distance; break;
              case 5: offsetLat = -distance; offsetLng = -ring * lngOffset; break;
              case 6: offsetLng = -ring * lngOffset; break;
              case 7: offsetLat = distance; offsetLng = -ring * lngOffset; break;
            }
          }
        }
        
        const newLat = baseLocation.lat + offsetLat;
        const newLng = baseLocation.lng + offsetLng;
        
        const promises = allTypes.map(t => 
          fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${newLat},${newLng}&radius=${nextRadius}&type=${t}&key=${apiKey}`)
            .then(res => res.json())
            .catch(() => ({ results: [] }))
        );
        
        const allResults = await Promise.all(promises);
        
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
        
        const shuffledResults = combinedResults.sort(() => Math.random() - 0.5);
        
        const maxRadius = 500000;
        const hasMore = shuffledResults.length > 0 && nextRadius < maxRadius;
        
        return res.json({ 
          results: shuffledResults,
          next_page_token: hasMore ? `page_${nextPage + 1}_radius_${nextRadius}` : null,
          search_info: {
            page: nextPage,
            radius: nextRadius,
            location: { lat: newLat, lng: newLng }
          }
        });
      }
    } else if (pagetoken) {
      // Use pagetoken for next page of results (standard Google pagination)
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
        fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.lat},${location.lng}&radius=${searchRadius}&type=${t}&key=${apiKey}`)
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
      
      return res.json({ 
        results: shuffledResults,
        next_page_token: `page_1_radius_${searchRadius}`
      });
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

// Google Places Details API endpoint
app.get('/api/place-details', async (req, res) => {
  try {
    const { place_id } = req.query;
    const apiKey = GOOGLE_API_KEY;
    
    if (!apiKey || apiKey === 'YOUR_API_KEY') {
      return res.status(400).json({ 
        error: 'Google API key is required. Set GOOGLE_API_KEY env variable' 
      });
    }
    
    if (!place_id) {
      return res.status(400).json({ error: 'Place ID is required' });
    }
    
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=name,formatted_address,formatted_phone_number,international_phone_number,website,geometry,rating,user_ratings_total,reviews,photos,types,opening_hours,business_status,price_level,url&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    res.json(data);
  } catch (error) {
    console.error('Error calling Google Places Details API:', error);
    res.status(500).json({ error: 'Failed to fetch place details' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});
