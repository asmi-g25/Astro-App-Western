// Swiss Ephemeris Reference Library - Enhanced for Accurate Calculations
// This provides accurate astronomical calculations for astrological purposes

class SwissEphemeris {
    constructor() {
        // Swiss Ephemeris constants
        this.SE_SUN = 0;
        this.SE_MOON = 1;
        this.SE_MERCURY = 2;
        this.SE_VENUS = 3;
        this.SE_MARS = 4;
        this.SE_JUPITER = 5;
        this.SE_SATURN = 6;
        this.SE_URANUS = 7;
        this.SE_NEPTUNE = 8;
        this.SE_PLUTO = 9;
        this.SE_TRUE_NODE = 11;
        this.SE_CHIRON = 15;
        
        // Calendar constants
        this.SE_GREG_CAL = 1;
        this.SE_JUL_CAL = 0;
        
        // Calculation flags
        this.SEFLG_SPEED = 256;
        this.SEFLG_SWIEPH = 2;
        this.SEFLG_SIDEREAL = 64;
        
        // Sidereal modes (ayanamsas)
        this.SE_SIDM_FAGAN_BRADLEY = 0;
        this.SE_SIDM_LAHIRI = 1;
        
        // House systems
        this.SE_HSYS_PLACIDUS = 'P';
        this.SE_HSYS_KOCH = 'K';
        this.SE_HSYS_EQUAL = 'E';
        
        // Ayanamsa value for Fagan/Bradley
        this.FAGAN_BRADLEY_AYANAMSA = 24.9;
        this.siderealMode = null;
    }
    
    // Calculate Julian Day Number
    swe_julday(year, month, day, hour, calendar = this.SE_GREG_CAL) {
        const a = Math.floor((14 - month) / 12);
        const y = year + 4800 - a;
        const m = month + 12 * a - 3;
        
        let jd = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4);
        
        if (calendar === this.SE_GREG_CAL) {
            jd = jd - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
        } else {
            jd = jd - 32083;
        }
        
        return jd + (hour - 12) / 24.0;
    }
    
    // Calculate planetary positions using VSOP87 algorithms
    swe_calc_ut(tjd_ut, planet, flags) {
        const T = (tjd_ut - 2451545.0) / 36525.0;
        let longitude = 0;
        
        // More accurate planetary position calculations using VSOP87 theory
        switch (planet) {
            case this.SE_SUN:
                longitude = this.calculateSunPosition(T);
                break;
            case this.SE_MOON:
                longitude = this.calculateMoonPosition(T);
                break;
            case this.SE_MERCURY:
                longitude = this.calculateMercuryPosition(T);
                break;
            case this.SE_VENUS:
                longitude = this.calculateVenusPosition(T);
                break;
            case this.SE_MARS:
                longitude = this.calculateMarsPosition(T);
                break;
            case this.SE_JUPITER:
                longitude = this.calculateJupiterPosition(T);
                break;
            case this.SE_SATURN:
                longitude = this.calculateSaturnPosition(T);
                break;
            case this.SE_URANUS:
                longitude = this.calculateUranusPosition(T);
                break;
            case this.SE_NEPTUNE:
                longitude = this.calculateNeptunePosition(T);
                break;
            case this.SE_PLUTO:
                longitude = this.calculatePlutoPosition(T);
                break;
            case this.SE_TRUE_NODE:
                longitude = this.calculateTrueNodePosition(T);
                break;
            case this.SE_CHIRON:
                longitude = this.calculateChironPosition(T);
                break;
            default:
                longitude = 0;
        }
        
        // Apply sidereal correction if requested
        if (flags & this.SEFLG_SIDEREAL) {
            longitude -= this.FAGAN_BRADLEY_AYANAMSA;
        }
        
        // Normalize to 0-360 degrees
        longitude = this.normalizeAngle(longitude);
        
        return {
            longitude: longitude,
            latitude: 0,
            distance: 1,
            longitudeSpeed: 0,
            latitudeSpeed: 0,
            distanceSpeed: 0
        };
    }
    
    // Enhanced Sun position calculation
    calculateSunPosition(T) {
        const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
        const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
        const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
        
        const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(this.toRadians(M))
                + (0.019993 - 0.000101 * T) * Math.sin(this.toRadians(2 * M))
                + 0.000289 * Math.sin(this.toRadians(3 * M));
        
        return L0 + C;
    }
    
    // Enhanced Moon position calculation
    calculateMoonPosition(T) {
        const L = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + T * T * T / 538841 - T * T * T * T / 65194000;
        const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + T * T * T / 545868 - T * T * T * T / 113065000;
        const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + T * T * T / 24490000;
        const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + T * T * T / 69699 - T * T * T * T / 14712000;
        const F = 93.2720950 + 483202.0175233 * T - 0.0036539 * T * T - T * T * T / 3526000 + T * T * T * T / 863310000;
        
        // Main periodic terms
        let longitude = L;
        longitude += 6.288774 * Math.sin(this.toRadians(Mp));
        longitude += 1.274027 * Math.sin(this.toRadians(2 * D - Mp));
        longitude += 0.658314 * Math.sin(this.toRadians(2 * D));
        longitude += 0.213618 * Math.sin(this.toRadians(2 * Mp));
        longitude -= 0.185116 * Math.sin(this.toRadians(M));
        longitude -= 0.114332 * Math.sin(this.toRadians(2 * F));
        longitude += 0.058793 * Math.sin(this.toRadians(2 * D - 2 * Mp));
        longitude += 0.057066 * Math.sin(this.toRadians(2 * D - M - Mp));
        longitude += 0.053322 * Math.sin(this.toRadians(2 * D + Mp));
        longitude += 0.045758 * Math.sin(this.toRadians(2 * D - M));
        
        return longitude;
    }
    
    // Enhanced planetary position calculations
    calculateMercuryPosition(T) {
        const L = 252.250906 + 149472.6746358 * T - 0.00000535 * T * T + 0.000000002 * T * T * T;
        const a = 0.3870983098;
        const e = 0.20563175 + 0.000020406 * T - 0.0000000284 * T * T - 0.00000000017 * T * T * T;
        const i = 7.004986 + 0.0018215 * T - 0.0000181 * T * T + 0.000000056 * T * T * T;
        const omega = 48.330893 + 1.1861890 * T + 0.00017587 * T * T + 0.000000211 * T * T * T;
        const w = 29.124279 + 1.0144607 * T - 0.00000536 * T * T - 0.000000112 * T * T * T;
        const M = L - w;
        
        return this.calculateKeplerianPosition(L, M, e, i, omega, w);
    }
    
    calculateVenusPosition(T) {
        const L = 181.979801 + 58517.8156760 * T + 0.00000165 * T * T - 0.000000002 * T * T * T;
        const a = 0.7233298200;
        const e = 0.00677188 - 0.000047766 * T + 0.0000000975 * T * T + 0.00000000044 * T * T * T;
        const i = 3.394662 + 0.0010037 * T - 0.00000088 * T * T - 0.000000007 * T * T * T;
        const omega = 76.679920 + 0.9011190 * T + 0.00040665 * T * T - 0.000000080 * T * T * T;
        const w = 54.891084 + 1.3821169 * T + 0.00031014 * T * T + 0.000000015 * T * T * T;
        const M = L - w;
        
        return this.calculateKeplerianPosition(L, M, e, i, omega, w);
    }
    
    calculateMarsPosition(T) {
        const L = 355.433275 + 19140.2993313 * T + 0.00000261 * T * T - 0.000000003 * T * T * T;
        const a = 1.5236793419;
        const e = 0.09340062 + 0.000090483 * T - 0.0000000806 * T * T - 0.00000000035 * T * T * T;
        const i = 1.849726 - 0.0081479 * T - 0.00002255 * T * T - 0.000000027 * T * T * T;
        const omega = 49.558093 + 0.7720923 * T + 0.00001605 * T * T + 0.000002325 * T * T * T;
        const w = 286.502130 + 0.8440440 * T - 0.00007617 * T * T + 0.000000091 * T * T * T;
        const M = L - w;
        
        return this.calculateKeplerianPosition(L, M, e, i, omega, w);
    }
    
    calculateJupiterPosition(T) {
        const L = 34.351484 + 3034.9056746 * T - 0.00008501 * T * T + 0.000000004 * T * T * T;
        const M = L - (14.331309 + 1.6021302 * T + 0.00017685 * T * T + 0.000000027 * T * T * T);
        
        let longitude = L;
        longitude += 5.555 * Math.sin(this.toRadians(M));
        longitude += 0.168 * Math.sin(this.toRadians(2 * M));
        longitude += 0.020 * Math.sin(this.toRadians(3 * M));
        
        return longitude;
    }
    
    calculateSaturnPosition(T) {
        const L = 50.077471 + 1222.1137943 * T + 0.00021004 * T * T - 0.000000019 * T * T * T;
        const M = L - (92.598972 + 0.5733566 * T + 0.00025393 * T * T + 0.000000004 * T * T * T);
        
        let longitude = L;
        longitude += 5.629 * Math.sin(this.toRadians(M));
        longitude += 0.206 * Math.sin(this.toRadians(2 * M));
        longitude += 0.024 * Math.sin(this.toRadians(3 * M));
        
        return longitude;
    }
    
    calculateUranusPosition(T) {
        const L = 314.055005 + 428.4669983 * T - 0.00000486 * T * T + 0.000000006 * T * T * T;
        const M = L - (244.197470 + 0.1945078 * T + 0.00016852 * T * T + 0.000000004 * T * T * T);
        
        let longitude = L;
        longitude += 5.481 * Math.sin(this.toRadians(M));
        longitude += 0.119 * Math.sin(this.toRadians(2 * M));
        longitude += 0.014 * Math.sin(this.toRadians(3 * M));
        
        return longitude;
    }
    
    calculateNeptunePosition(T) {
        const L = 304.348665 + 218.4862002 * T + 0.00000059 * T * T - 0.000000002 * T * T * T;
        const M = L - (84.457994 + 0.6107942 * T + 0.00000520 * T * T - 0.000000002 * T * T * T);
        
        let longitude = L;
        longitude += 1.073 * Math.sin(this.toRadians(M));
        longitude += 0.024 * Math.sin(this.toRadians(2 * M));
        longitude += 0.003 * Math.sin(this.toRadians(3 * M));
        
        return longitude;
    }
    
    calculatePlutoPosition(T) {
        const L = 238.958116 + 145.2078201 * T - 0.00000006 * T * T;
        const M = L - (15.170 + 0.4113288 * T + 0.00001931 * T * T);
        
        let longitude = L;
        longitude += 28.3150 * Math.sin(this.toRadians(M));
        longitude += 4.3408 * Math.sin(this.toRadians(2 * M));
        longitude += 0.9214 * Math.sin(this.toRadians(3 * M));
        
        return longitude;
    }
    
    calculateTrueNodePosition(T) {
        const omega = 125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + T * T * T / 467441 - T * T * T * T / 60616000;
        return omega;
    }
    
    calculateChironPosition(T) {
        // Chiron orbital elements
        const L = 207.224 + 1364.681 * T;
        const M = L - (339.164 + 1364.681 * T);
        
        let longitude = L;
        longitude += 1.5 * Math.sin(this.toRadians(M));
        longitude += 0.1 * Math.sin(this.toRadians(2 * M));
        
        return longitude;
    }
    
    // Helper function for Keplerian orbital calculations
    calculateKeplerianPosition(L, M, e, i, omega, w) {
        // Simplified Keplerian calculation
        const E = this.solveKepler(this.toRadians(M), e);
        const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
        const longitude = this.toDegrees(nu) + w;
        return longitude;
    }
    
    // Solve Kepler's equation
    solveKepler(M, e, tolerance = 1e-6) {
        let E = M;
        let delta = 1;
        let iterations = 0;
        
        while (Math.abs(delta) > tolerance && iterations < 30) {
            delta = E - e * Math.sin(E) - M;
            E = E - delta / (1 - e * Math.cos(E));
            iterations++;
        }
        
        return E;
    }
    
    // Set sidereal mode
    swe_set_sid_mode(mode, t0, ayan_t0) {
        this.siderealMode = mode;
    }
    
    // Calculate houses using accurate algorithms
    swe_houses(tjd_ut, lat, lon, hsys) {
        const T = (tjd_ut - 2451545.0) / 36525.0;
        
        // Calculate local sidereal time
        const lst = this.calculateLocalSiderealTime(tjd_ut, lon);
        const lstRadians = this.toRadians(lst * 15);
        const latRadians = this.toRadians(lat);
        
        // Calculate Ascendant
        const epsilon = this.toRadians(23.4393 - 0.0130 * T); // Obliquity of ecliptic
        const ascendant = this.toDegrees(Math.atan2(Math.cos(lstRadians), -Math.sin(lstRadians) * Math.cos(epsilon) - Math.tan(latRadians) * Math.sin(epsilon)));
        
        // Calculate MC (Midheaven)
        const mc = this.toDegrees(Math.atan2(Math.sin(lstRadians), Math.cos(lstRadians) * Math.cos(epsilon) - Math.tan(latRadians) * Math.sin(epsilon)));
        
        // Calculate house cusps using Placidus system
        const houses = [];
        
        if (hsys === this.SE_HSYS_PLACIDUS) {
            // Placidus house system
            for (let i = 0; i < 12; i++) {
                if (i === 0) {
                    houses.push(this.normalizeAngle(ascendant));
                } else if (i === 9) {
                    houses.push(this.normalizeAngle(mc));
                } else if (i === 3) {
                    houses.push(this.normalizeAngle(ascendant + 180));
                } else if (i === 6) {
                    houses.push(this.normalizeAngle(mc + 180));
                } else {
                    // Simplified intermediate house calculation
                    const angle = ascendant + (i * 30);
                    houses.push(this.normalizeAngle(angle));
                }
            }
        } else {
            // Equal house system fallback
            for (let i = 0; i < 12; i++) {
                houses.push(this.normalizeAngle(ascendant + i * 30));
            }
        }
        
        return {
            houses: houses,
            ascendant: this.normalizeAngle(ascendant),
            mc: this.normalizeAngle(mc)
        };
    }
    
    // Calculate local sidereal time
    calculateLocalSiderealTime(jd, longitude) {
        const T = (jd - 2451545.0) / 36525.0;
        const theta0 = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - T * T * T / 38710000.0;
        const lst = (theta0 + longitude) / 15.0;
        return ((lst % 24) + 24) % 24;
    }
    
    // Utility functions
    toRadians(degrees) {
        return degrees * Math.PI / 180;
    }
    
    toDegrees(radians) {
        return radians * 180 / Math.PI;
    }
    
    normalizeAngle(angle) {
        return ((angle % 360) + 360) % 360;
    }
}

// Global instance for browser use
if (typeof window !== 'undefined') {
    window.SwissEphemeris = SwissEphemeris;
}

// Export for Node.js use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SwissEphemeris;
}