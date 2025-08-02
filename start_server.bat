@echo off
echo 🚀 Starting Swiss Ephemeris Server with Static File Serving...
echo.

echo 📦 Installing dependencies...
pip install -r requirements.txt

echo.
echo 🌐 Starting server...
echo Your app will be available at: http://localhost:5000
echo.
echo Press Ctrl+C to stop the server
echo.

python sweph_server.py

pause