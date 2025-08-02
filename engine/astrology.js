// Astrological calculations using real Swiss Ephemeris via Python backend
console.log('Defining AstrologyEngine class...');
class AstrologyEngine {
    constructor() {
        console.log('AstrologyEngine constructor called');
        this.FAGAN_BRADLEY_AYANAMSA = 24.9;
        this.geocodeCache = new Map();
        this.ZODIAC_SIGNS = [
            'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
            'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
        ];
        
        // Python backend configuration
        this.backendUrl = 'http://127.0.0.1:5000';
        this.geocoder = null;
        this.initialized = false;
        this.backendAvailable = false;
        console.log('AstrologyEngine constructor completed');
    }
    
    // Initialize and test backend connection
    async initialize() {
        console.log('Initializing astrology engine...');
        
        try {
            // Test backend connection
            const response = await fetch(`${this.backendUrl}/health`);
            if (response.ok) {
                const health = await response.json();
                this.backendAvailable = health.sweph_available;
                console.log('Backend health check:', health);
            }
            
            // Test ephemeris
            const testResponse = await fetch(`${this.backendUrl}/test_ephemeris`);
            if (testResponse.ok) {
                const testResult = await testResponse.json();
                console.log('Ephemeris test result:', testResult);
                
                if (testResult.success) {
                    console.log(`✅ Swiss Ephemeris working! Found ${testResult.ephe_files_count} ephemeris files`);
                    console.log(`📊 Test calculation: Sun at ${testResult.test_calculation.sun_position_tropical}° on ${testResult.test_calculation.date}`);
                } else {
                    console.error('❌ Swiss Ephemeris test failed:', testResult.error);
                }
            }
            
            this.initialized = true;
            console.log('Astrology engine initialized successfully');
            
        } catch (error) {
            console.error('Backend connection failed:', error);
            console.error('Make sure Python server is running: python sweph_server.py');
            this.backendAvailable = false;
            this.initialized = true; // Still mark as initialized for error handling
        }
    }
    
    // Calculate natal chart using real Swiss Ephemeris
    async calculateNatalChart(dateOfBirth, timeOfBirth, placeOfBirth) {
        if (!this.initialized) {
            throw new Error('Astrology engine not initialized');
        }
        
        if (!this.backendAvailable) {
            throw new Error('Swiss Ephemeris backend not available. Please start the Python server: python sweph_server.py');
        }
        
        try {
            console.log('calculateNatalChart called with:', { dateOfBirth, timeOfBirth, placeOfBirth });
            
            // Get coordinates for birth location
            console.log('Getting coordinates for:', placeOfBirth);
            const coords = await this.geocodeLocation(placeOfBirth);
            console.log('Coordinates received:', coords);
            
            if (!coords.lat || !coords.lon) {
                throw new Error(`Could not geocode location: ${placeOfBirth}. Valid coordinates are required for accurate calculations.`);
            }
            
            // Call Python backend for calculations
            console.log('Calling Swiss Ephemeris backend...');
            const response = await fetch(`${this.backendUrl}/calculate_natal_chart`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    dateOfBirth: dateOfBirth,
                    timeOfBirth: timeOfBirth,
                    latitude: coords.lat,
                    longitude: coords.lon
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Backend calculation failed: ${errorData.error}`);
            }
            
            const result = await response.json();
            console.log('Backend calculation result:', result);
            
            if (!result.success) {
                throw new Error(`Calculation failed: ${result.error}`);
            }
            
            // Format the result to match our expected structure
            const positions = {
                Sun: result.positions.Sun,
                Moon: result.positions.Moon,
                Mercury: result.positions.Mercury,
                Venus: result.positions.Venus,
                Mars: result.positions.Mars,
                Jupiter: result.positions.Jupiter,
                Saturn: result.positions.Saturn,
                Uranus: result.positions.Uranus,
                Neptune: result.positions.Neptune,
                Pluto: result.positions.Pluto,
                TrueNode: result.positions.TrueNode,
                Chiron: result.positions.Chiron,
                Ascendant: result.positions.Ascendant,
                MC: result.positions.MC,
                Fortuna: result.positions.Fortuna,
                Vertex: result.positions.Vertex
            };
            
            console.log('Planetary positions calculated:', positions);
            
            // Add house positions to each planet
            const houses = result.houses;
            Object.keys(positions).forEach(planetKey => {
                const planetPosition = positions[planetKey];
                const house = this.getPlanetHouse(planetPosition, houses);
                positions[planetKey + 'House'] = house;
            });
            
            // Calculate natal aspects
            positions.natalAspects = this.calculateNatalAspects(positions);
            
            // Add additional properties
            positions.coordinates = coords;
            positions.julianDay = result.julianDay;
            positions.swephAvailable = result.swephAvailable;
            positions.houses = houses;
            
            console.log('Final natal chart:', positions);
            return positions;
            
        } catch (error) {
            console.error('Error in calculateNatalChart:', error);
            console.error('Error stack:', error.stack);
            throw error;
        }
    }
    
    // Real-time geocoding
    async geocodeLocation(location) {
        try {
            console.log('geocodeLocation called with:', location);
            
            // Check cache first
            if (this.geocodeCache.has(location)) {
                console.log('Using cached coordinates for:', location);
                return this.geocodeCache.get(location);
            }
            
            console.log('Geocoding using direct API call...');
            
            // Use Nominatim for geocoding
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`,
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'Searchster/1.0'
                    }
                }
            );
            
            console.log('API response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('API response data:', data);
                if (data && data.length > 0) {
                    const result = {
                        lat: parseFloat(data[0].lat),
                        lon: parseFloat(data[0].lon),
                        display_name: data[0].display_name
                    };
                    
                    this.geocodeCache.set(location, result);
                    console.log('API geocoding result:', result);
                    return result;
                }
            }
            
            throw new Error(`Could not geocode location: ${location}. Please provide a valid location for accurate calculations.`);
            
        } catch (error) {
            console.error('Geocoding error:', error);
            throw error;
        }
    }
    
    // Search for location suggestions
    async searchLocations(query) {
        if (!query || query.length < 2) {
            return [];
        }
        
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
                {
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'Searchster/1.0'
                    }
                }
            );
            
            if (response.ok) {
                const data = await response.json();
                return data.map(item => ({
                    display_name: item.display_name,
                    lat: item.lat,
                    lon: item.lon
                }));
            }
            
            return [];
        } catch (error) {
            console.error('Location search error:', error);
            return [];
        }
    }
    
    // Determine which house a planet is in
    getPlanetHouse(planetPosition, houses) {
        for (let house = 0; house < 12; house++) {
            const currentHouse = houses[house];
            const nextHouse = houses[house === 11 ? 0 : house + 1];
            
            if (currentHouse <= nextHouse) {
                if (planetPosition >= currentHouse && planetPosition < nextHouse) {
                    return house + 1;
                }
            } else {
                if (planetPosition >= currentHouse || planetPosition < nextHouse) {
                    return house + 1;
                }
            }
        }
        return 1;
    }
    
    // Calculate natal aspects within a chart
    calculateNatalAspects(positions) {
        const planets = [
            'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 
            'Saturn', 'Uranus', 'Neptune', 'Pluto', 'TrueNode', 'Chiron'
        ];
        
        const aspects = [];
        
        for (let i = 0; i < planets.length; i++) {
            for (let j = i + 1; j < planets.length; j++) {
                const planet1 = planets[i];
                const planet2 = planets[j];
                const pos1 = positions[planet1];
                const pos2 = positions[planet2];
                
                if (pos1 !== undefined && pos2 !== undefined) {
                    const aspect = this.findAspect(pos1, pos2);
                    if (aspect.name !== 'None') {
                        aspects.push({
                            planet1: planet1,
                            planet2: planet2,
                            aspect: aspect.name,
                            orb: aspect.orb,
                            strength: aspect.strength
                        });
                    }
                }
            }
        }
        
        return aspects;
    }
    
    // Find aspect between two planetary positions
    findAspect(pos1, pos2) {
        const diff = Math.abs(pos1 - pos2);
        const angle = Math.min(diff, 360 - diff);
        
        // Major and minor aspects with orbs
        const aspects = [
            { name: 'Conjunction', angle: 0, orb: 8, strength: 1.0 },
            { name: 'Semisextile', angle: 30, orb: 3, strength: 0.3 },
            { name: 'Sextile', angle: 60, orb: 6, strength: 0.8 },
            { name: 'Square', angle: 90, orb: 8, strength: 0.6 },
            { name: 'Trine', angle: 120, orb: 8, strength: 0.9 },
            { name: 'Sesquiquadrate', angle: 135, orb: 3, strength: 0.4 },
            { name: 'Quincunx', angle: 150, orb: 3, strength: 0.3 },
            { name: 'Opposition', angle: 180, orb: 8, strength: 0.7 }
        ];
        
        for (const aspect of aspects) {
            const aspectDiff = Math.abs(angle - aspect.angle);
            if (aspectDiff <= aspect.orb) {
                const exactness = 1 - (aspectDiff / aspect.orb);
                return {
                    name: aspect.name,
                    orb: aspectDiff.toFixed(2),
                    strength: aspect.strength * exactness
                };
            }
        }
        
        return { name: 'None', orb: 0, strength: 0 };
    }
    
    // Convert degrees to sign and position
    degreesToSign(degrees) {
        const normalizedDegrees = ((degrees % 360) + 360) % 360;
        const signIndex = Math.floor(normalizedDegrees / 30) % 12;
        const degreesInSign = Math.floor(normalizedDegrees % 30);
        const minutes = Math.floor((normalizedDegrees % 1) * 60);
        
        return {
            sign: this.ZODIAC_SIGNS[signIndex],
            degreesInSign,
            minutes
        };
    }
    
    // Compatibility calculations (using existing methods)
    async calculateCompatibility(user1, user2) {
        if (!this.initialized) {
            throw new Error('Astrology engine not initialized');
        }
        
        // Primary Mars-Venus cross-matching (Reverse-Synastry method)
        const venusMarsSynastry = this.calculateVenusMarsSynastry(user1, user2);
        
        // Full chart synastry for other planets
        const fullChartSynastry = this.calculateFullChartSynastry(user1, user2);
        
        // Calculate synastry aspects between charts
        const synastryAspects = this.calculateSynastryAspects(user1, user2);
        
        // Calculate house transpositions
        const houseTranspositions = await this.calculateHouseTranspositions(user1, user2);
        
        // Weighted compatibility score
        const compatibilityScore = (venusMarsSynastry * 0.4) + (fullChartSynastry * 0.3) + 
                                 (synastryAspects.score * 0.2) + (houseTranspositions.score * 0.1);
        
        return {
            compatibilityScore,
            venusMarsSynastry,
            fullChartSynastry,
            synastryAspects,
            houseTranspositions
        };
    }
    
    // Mars-Venus cross-matching synastry
    calculateVenusMarsSynastry(user1, user2) {
        const venus1Mars2 = this.calculateAspectStrength(user1.venusPosition, user2.marsPosition);
        const venus2Mars1 = this.calculateAspectStrength(user2.venusPosition, user1.marsPosition);
        return (venus1Mars2 + venus2Mars1) / 2;
    }
    
    // Full chart synastry calculation
    calculateFullChartSynastry(user1, user2) {
        const planets1 = [
            user1.sunPosition, user1.moonPosition, user1.mercuryPosition, user1.venusPosition,
            user1.marsPosition, user1.jupiterPosition, user1.saturnPosition, user1.uranusPosition,
            user1.neptunePosition, user1.plutoPosition, user1.trueNodePosition, user1.chironPosition,
            user1.fortunaPosition, user1.vertexPosition, user1.ascendantPosition, user1.midHeavenPosition
        ];
        
        const planets2 = [
            user2.sunPosition, user2.moonPosition, user2.mercuryPosition, user2.venusPosition,
            user2.marsPosition, user2.jupiterPosition, user2.saturnPosition, user2.uranusPosition,
            user2.neptunePosition, user2.plutoPosition, user2.trueNodePosition, user2.chironPosition,
            user2.fortunaPosition, user2.vertexPosition, user2.ascendantPosition, user2.midHeavenPosition
        ];
        
        let totalAspects = 0;
        let aspectCount = 0;
        
        for (let i = 0; i < planets1.length; i++) {
            for (let j = 0; j < planets2.length; j++) {
                if (planets1[i] !== undefined && planets2[j] !== undefined) {
                    totalAspects += this.calculateAspectStrength(planets1[i], planets2[j]);
                    aspectCount++;
                }
            }
        }
        
        return aspectCount > 0 ? totalAspects / aspectCount : 0;
    }
    
    // Calculate aspect strength between two planetary positions
    calculateAspectStrength(pos1, pos2) {
        if (pos1 === undefined || pos2 === undefined) {
            return 0;
        }
        
        const diff = Math.abs(pos1 - pos2);
        const angle = Math.min(diff, 360 - diff);
        
        const aspects = [
            { angle: 0, orb: 8, strength: 1.0 },     // Conjunction
            { angle: 60, orb: 6, strength: 0.8 },    // Sextile
            { angle: 90, orb: 8, strength: 0.6 },    // Square
            { angle: 120, orb: 8, strength: 0.9 },   // Trine
            { angle: 180, orb: 8, strength: 0.7 }    // Opposition
        ];
        
        for (const aspect of aspects) {
            const aspectDiff = Math.abs(angle - aspect.angle);
            if (aspectDiff <= aspect.orb) {
                const exactness = 1 - (aspectDiff / aspect.orb);
                return aspect.strength * exactness;
            }
        }
        
        return 0;
    }
    
    // Calculate synastry aspects between two charts
    calculateSynastryAspects(user1, user2) {
        const planets1 = [
            { name: 'sun', position: user1.sunPosition },
            { name: 'moon', position: user1.moonPosition },
            { name: 'mercury', position: user1.mercuryPosition },
            { name: 'venus', position: user1.venusPosition },
            { name: 'mars', position: user1.marsPosition },
            { name: 'jupiter', position: user1.jupiterPosition },
            { name: 'saturn', position: user1.saturnPosition },
            { name: 'uranus', position: user1.uranusPosition },
            { name: 'neptune', position: user1.neptunePosition },
            { name: 'pluto', position: user1.plutoPosition },
            { name: 'ascendant', position: user1.ascendantPosition },
            { name: 'midheaven', position: user1.midHeavenPosition }
        ];
        
        const planets2 = [
            { name: 'sun', position: user2.sunPosition },
            { name: 'moon', position: user2.moonPosition },
            { name: 'mercury', position: user2.mercuryPosition },
            { name: 'venus', position: user2.venusPosition },
            { name: 'mars', position: user2.marsPosition },
            { name: 'jupiter', position: user2.jupiterPosition },
            { name: 'saturn', position: user2.saturnPosition },
            { name: 'uranus', position: user2.uranusPosition },
            { name: 'neptune', position: user2.neptunePosition },
            { name: 'pluto', position: user2.plutoPosition },
            { name: 'ascendant', position: user2.ascendantPosition },
            { name: 'midheaven', position: user2.midHeavenPosition }
        ];
        
        const aspects = [];
        let totalScore = 0;
        
        planets1.forEach(planet1 => {
            planets2.forEach(planet2 => {
                if (planet1.position !== undefined && planet2.position !== undefined) {
                    const aspect = this.findAspect(planet1.position, planet2.position);
                    if (aspect.name !== 'None') {
                        aspects.push({
                            planet1: planet1.name,
                            planet2: planet2.name,
                            aspect: aspect.name,
                            orb: aspect.orb,
                            strength: aspect.strength
                        });
                        totalScore += aspect.strength;
                    }
                }
            });
        });
        
        return {
            aspects,
            score: aspects.length > 0 ? totalScore / aspects.length : 0,
            count: aspects.length
        };
    }
    
    // Calculate house transpositions (simplified for now)
    async calculateHouseTranspositions(user1, user2) {
        const transpositions = [];
        let harmoniousCount = 0;
        
        const planets = [
            { name: 'Sun', position: user1.sunPosition },
            { name: 'Moon', position: user1.moonPosition },
            { name: 'Venus', position: user1.venusPosition },
            { name: 'Mars', position: user1.marsPosition },
            { name: 'Jupiter', position: user1.jupiterPosition },
            { name: 'Saturn', position: user1.saturnPosition }
        ];
        
        // Use user2's houses (simplified - would need backend call for accuracy)
        const user2Houses = user2.houses || [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
        
        planets.forEach(planet => {
            if (planet.position !== undefined) {
                const house = this.getPlanetHouse(planet.position, user2Houses);
                transpositions.push({
                    planet: planet.name,
                    house: house,
                    owner: user1.username,
                    inChart: user2.username
                });
                
                if ([1, 5, 7, 9, 11].includes(house)) {
                    harmoniousCount++;
                }
            }
        });
        
        return {
            transpositions,
            score: planets.length > 0 ? harmoniousCount / planets.length : 0,
            harmoniousCount,
            totalPlacements: planets.length
        };
    }
    
    // Get zodiac sign from degrees
    getZodiacSign(degrees) {
        const normalizedDegrees = ((degrees % 360) + 360) % 360;
        const signIndex = Math.floor(normalizedDegrees / 30);
        return this.ZODIAC_SIGNS[signIndex];
    }
    
    // Format detailed planet position
    formatDetailedPlanetPosition(planetName, degrees, house, user) {
        const { sign, degreesInSign, minutes } = this.degreesToSign(degrees);
        const houseText = ` in House ${house}`;
        return `${planetName}: ${degreesInSign}°${minutes.toString().padStart(2, '0')}' ${sign}${houseText}`;
    }
    
    // Format house cusp
    formatHouseCusp(houseNumber, degrees) {
        const { sign, degreesInSign, minutes } = this.degreesToSign(degrees);
        return `House ${houseNumber}: ${degreesInSign}°${minutes.toString().padStart(2, '0')}' ${sign}`;
    }
    
    // Format planet position
    formatPlanetPosition(planetName, degrees, house) {
        const { sign, degreesInSign, minutes } = this.degreesToSign(degrees);
        return `${planetName}: ${degreesInSign}°${minutes.toString().padStart(2, '0')}' ${sign} in House ${house}`;
    }

    // Generate natal chart text for copying
    generateNatalChartText(userData) {
        let text = `NATAL CHART DATA for ${userData.username}\n`;
        text += `Born: ${userData.dateOfBirth} at ${userData.timeOfBirth}\n`;
        text += `Location: ${userData.placeOfBirth}\n`;
        text += `System: Sidereal (Fagan/Bradley Ayanamsa) - REAL Swiss Ephemeris\n\n`;
        
        const planets = [
            { name: 'Sun', position: userData.sunPosition },
            { name: 'Moon', position: userData.moonPosition },
            { name: 'Mercury', position: userData.mercuryPosition },
            { name: 'Venus', position: userData.venusPosition },
            { name: 'Mars', position: userData.marsPosition },
            { name: 'Jupiter', position: userData.jupiterPosition },
            { name: 'Saturn', position: userData.saturnPosition },
            { name: 'Uranus', position: userData.uranusPosition },
            { name: 'Neptune', position: userData.neptunePosition },
            { name: 'Pluto', position: userData.plutoPosition },
            { name: 'True Node', position: userData.trueNodePosition },
            { name: 'Chiron', position: userData.chironPosition },
            { name: 'Fortuna', position: userData.fortunaPosition },
            { name: 'Vertex', position: userData.vertexPosition },
            { name: 'Ascendant', position: userData.ascendantPosition },
            { name: 'Midheaven', position: userData.midHeavenPosition }
        ];
        
        planets.forEach(planet => {
            const houseKey = planet.name.toLowerCase().replace(/ /g, '') + 'PositionHouse';
            const house = userData[houseKey];
            text += this.formatPlanetPosition(planet.name, planet.position, house) + '\n';
        });
        
        if (userData.natalAspects && userData.natalAspects.length > 0) {
            text += '\nNATAL ASPECTS:\n';
            userData.natalAspects.forEach(aspect => {
                text += `${aspect.planet1} ${aspect.aspect} ${aspect.planet2} (orb: ${aspect.orb}°)\n`;
            });
        }
        
        return text;
    }
    
    // Generate synastry analysis text
    generateSynastryText(user1, user2, synastryData) {
        let text = `SYNASTRY ANALYSIS - REAL Swiss Ephemeris\n`;
        text += `${user1.username} & ${user2.username}\n\n`;
        text += `Overall Compatibility: ${(synastryData.compatibilityScore * 100).toFixed(1)}%\n`;
        text += `Venus-Mars Synastry: ${(synastryData.venusMarsSynastry * 100).toFixed(1)}%\n`;
        text += `Full Chart Synastry: ${(synastryData.fullChartSynastry * 100).toFixed(1)}%\n`;
        
        text += `Synastry Aspects Score: ${(synastryData.synastryAspects.score * 100).toFixed(1)}%\n`;
        text += `House Overlay Score: ${(synastryData.houseTranspositions.score * 100).toFixed(1)}%\n\n`;
        
        if (synastryData.synastryAspects.aspects.length > 0) {
            text += 'SYNASTRY ASPECTS:\n';
            synastryData.synastryAspects.aspects.forEach(aspect => {
                text += `${user1.username}'s ${aspect.planet1} ${aspect.aspect} ${user2.username}'s ${aspect.planet2} (orb: ${aspect.orb}°)\n`;
            });
        }
        
        if (synastryData.houseTranspositions.transpositions.length > 0) {
            text += '\nHOUSE OVERLAYS:\n';
            synastryData.houseTranspositions.transpositions.forEach(trans => {
                text += `${trans.owner}'s ${trans.planet} falls in ${trans.inChart}'s House ${trans.house}\n`;
            });
        }
        
        return text;
    }
}

// Global astrology engine instance
try {
    console.log('Creating global astrology instance...');
    const astrology = new AstrologyEngine();
    console.log('Astrology instance created:', astrology);

    // Expose classes globally for browser use
    if (typeof window !== 'undefined') {
        console.log('Exposing AstrologyEngine to window...');
        window.AstrologyEngine = AstrologyEngine;
        window.astrology = astrology;
        console.log('Window objects set:', {
            AstrologyEngine: typeof window.AstrologyEngine,
            astrology: typeof window.astrology
        });
    }

    // Export for Node.js use
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { AstrologyEngine, astrology };
    }
} catch (error) {
    console.error('Error in astrology.js global setup:', error);
    console.error('Error stack:', error.stack);
}

console.log('Final verification:');
console.log('AstrologyEngine class:', typeof AstrologyEngine);
console.log('window.AstrologyEngine:', typeof window?.AstrologyEngine);
console.log('window.astrology:', typeof window?.astrology);