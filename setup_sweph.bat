@echo off
echo Setting up Real Swiss Ephemeris for Astro-Sample...
echo.

echo 1. Installing Python dependencies...
pip install -r requirements.txt

echo.
echo 2. Testing Swiss Ephemeris installation...
python -c "import swisseph as swe; print(f'Swiss Ephemeris version: {swe.version if hasattr(swe, \"version\") else \"Unknown\"}')"

echo.
echo 3. Starting Swiss Ephemeris server...
echo Server will run at http://127.0.0.1:5000
echo.
echo Open your browser and go to: file:///c:/Users/asmi0/Downloads/Astro-Sample/Searchster.html
echo.
python sweph_server.py

pause