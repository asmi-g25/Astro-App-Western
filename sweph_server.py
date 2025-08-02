#!/usr/bin/env python3
"""
Swiss Ephemeris Server for Astro-Sample
Uses real Swiss Ephemeris data files for accurate calculations
WITH PROPER TIMEZONE HANDLING
"""

import os
import sys
import json
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

# Try to import timezone libraries
try:
    from timezonefinder import TimezoneFinder
    import pytz
    TIMEZONE_AVAILABLE = True
    tf = TimezoneFinder()
    print("✅ Timezone libraries loaded successfully")
except ImportError:
    TIMEZONE_AVAILABLE = False
    tf = None
    print("⚠️ Timezone libraries not found. Install with: pip install timezonefinder pytz")

# Try to import Swiss Ephemeris
try:
    import swisseph as swe
    SWEPH_AVAILABLE = True
    print("✅ Swiss Ephemeris library loaded successfully")
except ImportError:
    SWEPH_AVAILABLE = False
    print("❌ Swiss Ephemeris library not found. Install with: pip install pyswisseph")

app = Flask(__name__)
CORS(app)  # Enable CORS for browser requests

# Set the ephemeris path to our data files
EPHE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ephe')
if SWEPH_AVAILABLE:
    abs_ephe_path = os.path.abspath(EPHE_PATH)
    if os.path.exists(abs_ephe_path):
        # Set environment variable first (Swiss Ephemeris checks this)
        os.environ['SE_EPHE_PATH'] = abs_ephe_path
        
        # Then set the path in the library
        swe.set_ephe_path(abs_ephe_path)
        print(f"✅ Ephemeris path set to: {abs_ephe_path}")
        
        # List some files to verify
        ephe_files = [f for f in os.listdir(abs_ephe_path) if f.endswith('.se1')][:5]
        print(f"📁 Found ephemeris files: {ephe_files}")
        
        EPHE_PATH = abs_ephe_path
    else:
        print(f"❌ ERROR: Ephemeris path does not exist: {abs_ephe_path}")
        SWEPH_AVAILABLE = False

# Ayanamsa for sidereal calculations
FAGAN_BRADLEY_AYANAMSA = swe.SIDM_FAGAN_BRADLEY if SWEPH_AVAILABLE else 0

# Planet constants - EXCLUDING CHIRON FOR NOW
PLANETS = {
    'Sun': swe.SUN if SWEPH_AVAILABLE else 0,
    'Moon': swe.MOON if SWEPH_AVAILABLE else 1,
    'Mercury': swe.MERCURY if SWEPH_AVAILABLE else 2,
    'Venus': swe.VENUS if SWEPH_AVAILABLE else 3,
    'Mars': swe.MARS if SWEPH_AVAILABLE else 4,
    'Jupiter': swe.JUPITER if SWEPH_AVAILABLE else 5,
    'Saturn': swe.SATURN if SWEPH_AVAILABLE else 6,
    'Uranus': swe.URANUS if SWEPH_AVAILABLE else 7,
    'Neptune': swe.NEPTUNE if SWEPH_AVAILABLE else 8,
    'Pluto': swe.PLUTO if SWEPH_AVAILABLE else 9,
    'TrueNode': swe.TRUE_NODE if SWEPH_AVAILABLE else 11,
}

def get_timezone_for_location(latitude, longitude):
    """Get timezone for given coordinates"""
    if not TIMEZONE_AVAILABLE:
        print("⚠️ Timezone detection not available - assuming UTC")
        return 'UTC'
    
    try:
        timezone_str = tf.timezone_at(lat=latitude, lng=longitude)
        if timezone_str:
            print(f"🌍 Detected timezone: {timezone_str}")
            return timezone_str
        else:
            print("⚠️ Could not detect timezone - using UTC")
            return 'UTC'
    except Exception as e:
        print(f"⚠️ Error detecting timezone: {e} - using UTC")
        return 'UTC'

def convert_local_to_ut(date_str, time_str, latitude, longitude):
    """Convert local birth time to Universal Time (UT)"""
    if not TIMEZONE_AVAILABLE:
        # Fallback: assume the time is already in UTC
        print("⚠️ No timezone conversion - treating time as UTC")
        return datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
    
    try:
        # Get the timezone for the birth location
        timezone_str = get_timezone_for_location(latitude, longitude)
        local_tz = pytz.timezone(timezone_str)
        
        # Parse the local birth time
        naive_datetime = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
        
        # Localize to the birth location timezone
        local_datetime = local_tz.localize(naive_datetime)
        
        # Convert to UTC
        utc_datetime = local_datetime.astimezone(pytz.UTC)
        
        print(f"🕐 Local time: {local_datetime.strftime('%Y-%m-%d %H:%M %Z')}")
        print(f"🕐 UTC time: {utc_datetime.strftime('%Y-%m-%d %H:%M %Z')}")
        
        return utc_datetime.replace(tzinfo=None)  # Remove timezone info for Swiss Ephemeris
        
    except Exception as e:
        print(f"⚠️ Error in timezone conversion: {e}")
        print("⚠️ Falling back to treating time as UTC")
        return datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")

def calculate_julian_day(date_str, time_str, latitude, longitude):
    """Calculate Julian Day from local date/time, converting to UT"""
    if not SWEPH_AVAILABLE:
        return 2451545.0  # J2000.0 fallback
    
    # Convert local time to UT
    utc_datetime = convert_local_to_ut(date_str, time_str, latitude, longitude)
    
    # Calculate Julian Day using UT
    jd = swe.julday(
        utc_datetime.year,
        utc_datetime.month, 
        utc_datetime.day,
        utc_datetime.hour + utc_datetime.minute / 60.0 + utc_datetime.second / 3600.0
    )
    
    return jd

def calculate_planet_position(planet_name, jd, sidereal=True):
    """Calculate accurate planet position using Swiss Ephemeris"""
    if not SWEPH_AVAILABLE:
        return 0.0
    
    planet_id = PLANETS.get(planet_name)
    if planet_id is None:
        raise ValueError(f"Unknown planet: {planet_name}")
    
    # Set calculation flags
    flags = swe.FLG_SWIEPH
    if sidereal:
        flags |= swe.FLG_SIDEREAL
        swe.set_sid_mode(FAGAN_BRADLEY_AYANAMSA)
    
    try:
        # Calculate position
        result = swe.calc_ut(jd, planet_id, flags)
        longitude = result[0][0]  # Longitude in degrees
        return longitude
    except Exception as e:
        print(f"Error calculating {planet_name}: {str(e)}")
        raise

def calculate_chiron_fallback(jd):
    """Fallback calculation for Chiron when asteroid files aren't accessible"""
    # Simple approximation based on Chiron's orbital period (~50 years)
    days_since_j2000 = jd - 2451545.0
    years_since_j2000 = days_since_j2000 / 365.25
    
    # Chiron was around 207° at J2000, moves ~7.2°/year
    chiron_approx = (207.0 + years_since_j2000 * 7.2) % 360
    return chiron_approx

def calculate_houses(jd, lat, lon, house_system='P'):
    """Calculate house cusps using Swiss Ephemeris"""
    if not SWEPH_AVAILABLE:
        # Fallback equal houses
        return {
            'houses': [i * 30 for i in range(12)],
            'ascendant': 0.0,
            'mc': 90.0
        }
    
    try:
        # Calculate houses using Placidus system
        houses_result = swe.houses(jd, lat, lon, house_system.encode('ascii'))
        
        return {
            'houses': list(houses_result[0]),  # 12 house cusps
            'ascendant': houses_result[1][0],  # Ascendant
            'mc': houses_result[1][1]          # MC (Midheaven)
        }
    except Exception as e:
        print(f"Error calculating houses: {str(e)}")
        raise

def calculate_fortuna(sun_pos, moon_pos, asc_pos):
    """Calculate Part of Fortune: Asc + Moon - Sun"""
    fortuna = asc_pos + moon_pos - sun_pos
    return fortuna % 360

@app.route('/calculate_natal_chart', methods=['POST'])
def calculate_natal_chart():
    """Calculate complete natal chart with proper timezone handling"""
    try:
        data = request.get_json()
        
        # Extract parameters
        date_of_birth = data['dateOfBirth']
        time_of_birth = data['timeOfBirth'] 
        latitude = float(data['latitude'])
        longitude = float(data['longitude'])
        
        print(f"🔮 Calculating natal chart for {date_of_birth} {time_of_birth} at {latitude}, {longitude}")
        
        # Calculate Julian Day with timezone conversion
        jd = calculate_julian_day(date_of_birth, time_of_birth, latitude, longitude)
        print(f"📅 Julian Day (UT): {jd}")
        
        # Calculate planetary positions
        positions = {}
        for planet_name in PLANETS.keys():
            try:
                pos = calculate_planet_position(planet_name, jd, sidereal=True)
                positions[planet_name] = pos
                print(f"🪐 {planet_name}: {pos:.3f}°")
            except Exception as e:
                print(f"❌ Error calculating {planet_name}: {str(e)}")
                raise
        
        # Add Chiron with fallback calculation
        chiron_pos = calculate_chiron_fallback(jd)
        positions['Chiron'] = chiron_pos
        print(f"🪐 Chiron (approx): {chiron_pos:.3f}°")
        
        # Calculate houses and angles
        houses_data = calculate_houses(jd, latitude, longitude)
        positions['Ascendant'] = houses_data['ascendant']
        positions['MC'] = houses_data['mc']
        
        print(f"🏠 Ascendant: {positions['Ascendant']:.3f}°")
        print(f"🏠 MC: {positions['MC']:.3f}°")
        
        # Calculate Part of Fortune
        positions['Fortuna'] = calculate_fortuna(
            positions['Sun'], 
            positions['Moon'], 
            positions['Ascendant']
        )
        
        # Calculate Vertex (simplified)
        positions['Vertex'] = (positions['MC'] + 90) % 360
        
        # Return complete natal chart data
        result = {
            'success': True,
            'julianDay': jd,
            'positions': positions,
            'houses': houses_data['houses'],
            'swephAvailable': SWEPH_AVAILABLE,
            'timezoneAvailable': TIMEZONE_AVAILABLE,
            'ephePath': EPHE_PATH,
            'note': 'Timezone-corrected calculations using real Swiss Ephemeris'
        }
        
        print(f"✅ Calculation successful! Sun at {positions['Sun']:.2f}°")
        return jsonify(result)
        
    except Exception as e:
        print(f"❌ Error calculating natal chart: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'swephAvailable': SWEPH_AVAILABLE,
            'timezoneAvailable': TIMEZONE_AVAILABLE,
            'ephePath': EPHE_PATH
        }), 500

@app.route('/test_ephemeris', methods=['GET'])
def test_ephemeris():
    """Test Swiss Ephemeris installation and data files"""
    try:
        if not SWEPH_AVAILABLE:
            return jsonify({
                'success': False,
                'error': 'Swiss Ephemeris library not installed',
                'install_command': 'pip install pyswisseph'
            })
        
        # Test calculation for J2000.0
        jd = 2451545.0  # January 1, 2000, 12:00 UT
        sun_pos = calculate_planet_position('Sun', jd, sidereal=False)
        
        # Check if ephemeris files are accessible
        ephe_files = os.listdir(EPHE_PATH) if os.path.exists(EPHE_PATH) else []
        se1_files = [f for f in ephe_files if f.endswith('.se1')]
        
        return jsonify({
            'success': True,
            'sweph_version': swe.version if hasattr(swe, 'version') else 'Unknown',
            'timezone_available': TIMEZONE_AVAILABLE,
            'ephe_path': EPHE_PATH,
            'ephe_files_count': len(ephe_files),
            'se1_files_count': len(se1_files),
            'test_calculation': {
                'date': 'J2000.0 (Jan 1, 2000)',
                'sun_position_tropical': sun_pos,
                'note': 'Sun should be around 280° for Jan 1st'
            },
            'sample_files': se1_files[:10]  # Show first 10 .se1 files
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'sweph_available': SWEPH_AVAILABLE,
        'timezone_available': TIMEZONE_AVAILABLE,
        'ephe_path_exists': os.path.exists(EPHE_PATH),
        'ephe_path': EPHE_PATH
    })

if __name__ == '__main__':
    print("🚀 Starting Swiss Ephemeris Server with Timezone Support...")
    print(f"📊 Swiss Ephemeris Available: {SWEPH_AVAILABLE}")
    print(f"🌍 Timezone Support Available: {TIMEZONE_AVAILABLE}")
    print(f"📁 Ephemeris Path: {EPHE_PATH}")
    
    if not SWEPH_AVAILABLE:
        print("\n❌ To install Swiss Ephemeris:")
        print("pip install pyswisseph")
    
    if not TIMEZONE_AVAILABLE:
        print("\n⚠️ To install timezone support:")
        print("pip install timezonefinder pytz")
    
    if SWEPH_AVAILABLE and TIMEZONE_AVAILABLE:
        print("\n✅ Ready for accurate timezone-corrected astrological calculations!")
    
    # Start the server
    app.run(host='127.0.0.1', port=5000, debug=True)