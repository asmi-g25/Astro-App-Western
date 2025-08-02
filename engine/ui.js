// User interface functions and event handlers

// Send chat message function
function sendChatMessage() {
    const messageInput = document.getElementById('chatInput');
    const message = messageInput.value.trim();
    
    if (message && app.currentChatUser) {
        network.sendMessage(app.currentChatUser.id, message);
        messageInput.value = '';
        updateChatDisplay();
    }
}

// Show screen function
function showScreen(screenName) {
    const screens = ['welcomeScreen', 'matchesScreen'];
    screens.forEach(screen => {
        const element = document.getElementById(screen);
        if (screen === screenName) {
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    });
}

// View profile function  
function viewProfile(user) {
    app.currentProfileUser = user;
    const modal = document.getElementById('profileModal');
    modal.classList.remove('hidden');
    
    // Populate profile data
    const usernameEl = document.getElementById('profileUsername');
    const ageEl = document.getElementById('profileAge');
    const bioEl = document.getElementById('profileBio');
    
    usernameEl.textContent = user.username;
    ageEl.textContent = calculateAge(user.dateOfBirth);
    bioEl.textContent = user.bio || 'No bio available';
}

// Show settings function
function showSettings() {
    const modal = document.getElementById('settingsModal');
    modal.classList.remove('hidden');
    
    // Populate current user data
    document.getElementById('settingsUsername').value = app.currentUser.username;
    document.getElementById('settingsDateOfBirth').value = app.currentUser.dateOfBirth;
    document.getElementById('settingsTimeOfBirth').value = app.currentUser.timeOfBirth;
    document.getElementById('settingsPlaceOfBirth').value = app.currentUser.placeOfBirth;
}

// Main application functions
async function connect() {
    try {
        console.log('Connect function called');
        console.log('Global objects available:', { 
            app: typeof app, 
            astrology: typeof astrology, 
            network: typeof network 
        });
        
        const usernameEl = document.getElementById('username');
        const dateOfBirthEl = document.getElementById('dateOfBirth');
        const timeOfBirthEl = document.getElementById('timeOfBirth');
        const placeOfBirthEl = document.getElementById('placeOfBirth');
        
        console.log('Form elements found:', {
            usernameEl: !!usernameEl,
            dateOfBirthEl: !!dateOfBirthEl,
            timeOfBirthEl: !!timeOfBirthEl,
            placeOfBirthEl: !!placeOfBirthEl
        });
        
        const username = usernameEl.value.trim();
        const dateOfBirth = dateOfBirthEl.value;
        const timeOfBirth = timeOfBirthEl.value;
        const placeOfBirth = placeOfBirthEl.value.trim();
        const timeCertain = document.getElementById('timeCertain').checked;
        
        console.log('Form data:', { username, dateOfBirth, timeOfBirth, placeOfBirth, timeCertain });
        
        // Validate required fields
        if (!username) {
            alert('Please enter a username');
            return;
        }
        if (!dateOfBirth) {
            alert('Please enter your date of birth');
            return;
        }
        if (!timeOfBirth) {
            alert('Please enter your time of birth');
            return;
        }
        if (!placeOfBirth) {
            alert('Please enter your place of birth');
            return;
        }
        
        // Get gender selection
        const genderRadios = document.querySelectorAll('input[name="gender"]');
        let gender = null;
        for (const radio of genderRadios) {
            if (radio.checked) {
                gender = radio.value;
                break;
            }
        }
        
        if (!gender) {
            alert('Please select your gender');
            return;
        }
        
        // Get preference selections
        const lookingForMen = document.getElementById('lookingForMen').checked;
        const lookingForWomen = document.getElementById('lookingForWomen').checked;
        
        if (!lookingForMen && !lookingForWomen) {
            alert('Please select at least one gender preference');
            return;
        }
        
        console.log('Validation passed, calculating natal chart...');
        
        // Disable connect button during processing
        const connectBtn = document.getElementById('connectBtn');
        connectBtn.disabled = true;
        connectBtn.textContent = 'Connecting...';
        
        // Calculate natal chart with error handling
        let natalPositions;
        try {
            console.log('Calling astrology.calculateNatalChart...');
            natalPositions = await window.astrology.calculateNatalChart(dateOfBirth, timeOfBirth, placeOfBirth);
            console.log('Natal chart calculated successfully:', natalPositions);
            
            // Show verification modal if enabled
            const verificationMode = document.getElementById('verificationMode');
            if (verificationMode && verificationMode.checked) {
                const userData = {
                    dateOfBirth,
                    timeOfBirth,
                    placeOfBirth,
                    gender,
                    lookingForMen,
                    lookingForWomen
                };
                showVerificationModal(natalPositions, userData);
            }
        } catch (error) {
            console.error('Error calculating natal chart:', error);
            console.error('Error stack:', error.stack);
            // Create fallback natal positions
            natalPositions = {
                sunPosition: 0,
                moonPosition: 0,
                mercuryPosition: 0,
                venusPosition: 0,
                marsPosition: 0,
                jupiterPosition: 0,
                saturnPosition: 0,
                uranusPosition: 0,
                neptunePosition: 0,
                plutoPosition: 0,
                trueNodePosition: 0,
                chironPosition: 0,
                fortunaPosition: 0,
                vertexPosition: 0,
                ascendantPosition: 0,
                midHeavenPosition: 0,
                houses: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
                natalAspects: []
            };
            console.log('Using fallback natal positions');
        }
        
        console.log('Creating user object...');
        
        // Create user object
        const appInstance = window.app || app;
        appInstance.currentUser = {
            id: window.network.myPeerId,
            username,
            ipAddress: appInstance.getUserIP(),
            displayName: `${username}@${appInstance.getUserIP()}`,
            dateOfBirth,
            timeOfBirth,
            placeOfBirth,
            timeCertain,
            gender,
            lookingForMen,
            lookingForWomen,
            ...natalPositions,
            bio: '',
            age: calculateAge(dateOfBirth)
        };
        
        console.log('User object created:', appInstance.currentUser);
        
        // Save user data
        appInstance.saveUserData();
        
        // Announce presence to network
        window.network.announcePresence(appInstance.currentUser);
        
        // Switch to matches screen
        const welcomeScreen = document.getElementById('welcomeScreen');
        const matchesScreen = document.getElementById('matchesScreen');
        welcomeScreen.classList.add('hidden');
        matchesScreen.classList.remove('hidden');
        
        // Show profile button
        const profileBtn = document.querySelector('.profile-btn');
        profileBtn.classList.add('visible');
        
        // Find initial matches
        findMatches();
        
        console.log('Connect function completed successfully');
        
    } catch (error) {
        console.error('Error in connect function:', error);
        console.error('Error stack:', error.stack);
        alert('An error occurred while connecting. Please try again.');
        
        // Re-enable connect button
        const connectBtn = document.getElementById('connectBtn');
        connectBtn.disabled = false;
        connectBtn.textContent = 'Connect to Searchster Network';
    }
}

function calculateAge(dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    age = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;
    return age;
}

async function findMatches() {
    const minAgeElement = document.getElementById('minAge');
    const maxAgeElement = document.getElementById('maxAge');
    
    const minAge = parseInt(minAgeElement.value);
    const maxAge = parseInt(maxAgeElement.value);
    
    // Discover peers
    const peers = network.discoverPeers();
    
    const allUsers = [...peers];
    
    // Filter by age and gender preferences
    const filtered = allUsers.filter(user => {
        const userAge = calculateAge(user.dateOfBirth);
        user.age = userAge;
        
        // Gender preference matching (mutual)
        const userWantsMe = (app.currentUser.gender === 'man' && user.lookingForMen) ||
                           (app.currentUser.gender === 'woman' && user.lookingForWomen);
        
        const iWantUser = (user.gender === 'man' && app.currentUser.lookingForMen) ||
                         (user.gender === 'woman' && app.currentUser.lookingForWomen);
        
        return userWantsMe && iWantUser;
    });
    
    // Calculate compatibility for each user
    const matches = await Promise.all(filtered.map(async user => {
        const compatibility = await astrology.calculateCompatibility(app.currentUser, user);
        return {
            ...user,
            ...compatibility
        };
    }));
    
    // Sort by compatibility score
    matches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
    
    // Update matches list
    app.matches = matches;
    displayMatches(matches, minAge, maxAge);
}

function displayMatches(matches, minAge, maxAge) {
    const matchesList = document.getElementById('matchesList');
    
    matchesList.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
            <p>Matches found in the ${minAge}-${maxAge} age range.</p>
            <p>Displaying compatibility results.</p>
        </div>
    `;
    
    // Separate high compatibility and other matches
    const highCompatibility = matches.filter(m => m.compatibilityScore >= 0.6);
    const otherMatches = matches.filter(m => m.compatibilityScore < 0.6);
    
    let html = '';
    
    html += '<h3 style="color: var(--cosmic-purple); margin-bottom: 1rem;">High Compatibility Matches</h3>';
    html += highCompatibility.map(createMatchCard).join('');
    
    html += '<h3 style="color: var(--text-muted); margin: 2rem 0 1rem 0;">Other Matches</h3>';
    html += otherMatches.map(createMatchCard).join('');
    
    matchesList.innerHTML = html;
}

function createMatchCard(match) {
    const verifiedBadge = match.timeCertain ? '<span class="badge badge-golden">✓ Verified</span>' : '';
    const genderBadge = match.gender === 'man' ? '<span class="badge badge-male">♂</span>' : '<span class="badge badge-female">♀</span>';
    
    return `
        <div class="match-card" onclick="openChat('${match.id}')">
            <div class="match-header">
                <div class="match-username">
                    ${genderBadge}
                    ${verifiedBadge}
                    <span>${match.displayName}</span>
                </div>
                <div class="compatibility-score">${(match.compatibilityScore * 100).toFixed(1)}%</div>
            </div>
            
            <div class="match-details">
                <div class="detail-item">
                    <div class="detail-label">Age</div>
                    <div class="detail-value">${match.age}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Venus-Mars</div>
                    <div class="detail-value">${(match.venusMarsSynastry * 100).toFixed(1)}%</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Full Chart</div>
                    <div class="detail-value">${(match.fullChartSynastry * 100).toFixed(1)}%</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Location</div>
                    <div class="detail-value">${match.placeOfBirth}</div>
                </div>
            </div>
            
            <p style="margin-top: 1rem; color: var(--text-gray); font-style: italic;">"${match.bio}"</p>
        </div>
    `;
}

// Chat functions
function openChat(userId) {
    const user = app.matches.find(m => m.id === userId);
    
    app.currentChatUser = user;
    
    // Connect to peer
    network.connectToPeer(userId);
    
    // Update chat header
    const chatUsername = document.getElementById('chatUsername');
    chatUsername.textContent = user.displayName;
    
    // Load chat history
    updateChatDisplay();
    
    // Show chat panel
    const chatPanel = document.getElementById('chatPanel');
    chatPanel.classList.add('open');
}

function closeChat() {
    const chatPanel = document.getElementById('chatPanel');
    chatPanel.classList.remove('open');
    app.currentChatUser = null;
}

function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    // Send message through network
    network.sendMessage(app.currentChatUser.id, message);
    
    input.value = '';
    updateChatDisplay();
}

function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        sendMessage();
    }
}

function updateChatDisplay() {
    const messagesContainer = document.getElementById('chatMessages');
    const messages = app.chatHistory.get(app.currentChatUser.id) || [];
    
    const html = messages.map(msg => {
        const isOwn = msg.type === 'sent' || msg.from === network.myPeerId;
        const className = isOwn ? 'message own' : 'message other';
        const time = new Date(msg.timestamp).toLocaleTimeString();
        
        return `
            <div class="${className}">
                <div>${msg.message}</div>
                <div style="font-size: 0.8em; opacity: 0.7; margin-top: 0.5rem;">${time}</div>
            </div>
        `;
    }).join('');
    
    messagesContainer.innerHTML = html;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function saveChat() {
    const messages = app.chatHistory.get(app.currentChatUser.id) || [];
    
    const chatText = messages.map(msg => {
        const sender = msg.type === 'sent' ? 'You' : app.currentChatUser.username;
        const time = new Date(msg.timestamp).toLocaleString();
        return `[${time}] ${sender}: ${msg.message}`;
    }).join('\n');
    
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_${app.currentChatUser.username}_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    // Save to localStorage
    app.saveChatHistory();
}

// Profile functions
async function openProfile() {
    await showProfile(app.currentUser, true);
}

async function viewChatUserProfile() {
    const compatibility = await astrology.calculateCompatibility(app.currentUser, app.currentChatUser);
    showProfile(app.currentChatUser, false, compatibility);
}

async function showProfile(user, isOwnProfile, synastryData = null) {
    const modal = document.getElementById('profileModal');
    const content = document.getElementById('profileContent');
    
    const verifiedBadge = user.timeCertain ? '<span class="badge badge-golden">✓ Verified</span>' : '';
    const genderBadge = user.gender === 'man' ? '<span class="badge badge-male">♂</span>' : '<span class="badge badge-female">♀</span>';
    
    let html = `
        <div class="profile-header">
            <div class="profile-avatar">
                <img src="${user.profileImage}" alt="Profile" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover;">
            </div>
            <div>
                <h2>${genderBadge} ${verifiedBadge} ${user.displayName}</h2>
                <p style="color: var(--text-muted);">Born: ${user.dateOfBirth} at ${user.timeOfBirth}</p>
                <p style="color: var(--text-muted);">Location: ${user.placeOfBirth}</p>
            </div>
        </div>
    `;
    
    // Bio section with profile image upload
    html += `
        <div style="margin-bottom: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 style="color: var(--cosmic-purple);">Bio</h3>
                <div style="display: flex; gap: 0.5rem;">
                    ${isOwnProfile ? '<button class="copy-btn" onclick="editBio()">Edit Bio</button>' : ''}
                    ${isOwnProfile ? '<button class="copy-btn" onclick="uploadProfileImage()">Change Image</button>' : ''}
                </div>
            </div>
            <div style="background: rgba(51, 65, 85, 0.5); border-radius: 0.5rem; padding: 1rem; min-height: 60px;">
                ${user.bio}
            </div>
        </div>
    `;
    
    // Natal chart data
    const natalDataHTML = await generateNatalDataHTML(user);
    html += `
        <div style="margin-bottom: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 style="color: var(--cosmic-purple);">Natal Chart Data</h3>
                <button class="copy-btn" onclick="copyNatalData('${user.id}')">Copy Data</button>
            </div>
            <div class="natal-data" style="background: rgba(139, 92, 246, 0.1); padding: 1rem; border-radius: 0.5rem; border: 1px solid rgba(139, 92, 246, 0.3);">
                ${natalDataHTML}
            </div>
        </div>
    `;
    
    // Synastry data for other users
    html += `
        <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 style="color: var(--cosmic-purple);">Synastry Analysis</h3>
                <button class="copy-btn" onclick="copySynastryData()">Copy Analysis</button>
            </div>
            <div class="natal-data">
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; text-align: center;">
                    <div>
                        <div style="font-size: 1.2rem; font-weight: bold; color: var(--cosmic-purple);">
                            ${(synastryData.compatibilityScore * 100).toFixed(1)}%
                        </div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Overall</div>
                    </div>
                    <div>
                        <div style="font-size: 1.2rem; font-weight: bold; color: var(--cosmic-pink);">
                            ${(synastryData.venusMarsSynastry * 100).toFixed(1)}%
                        </div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Venus-Mars</div>
                    </div>
                    <div>
                        <div style="font-size: 1.2rem; font-weight: bold; color: var(--text-white);">
                            ${(synastryData.fullChartSynastry * 100).toFixed(1)}%
                        </div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Full Chart</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    content.innerHTML = html;
    modal.classList.remove('hidden');
}

async function generateNatalDataHTML(user) {
    // Ensure we have calculated positions
    const natalData = await astrology.calculateNatalChart(user.dateOfBirth, user.timeOfBirth, user.placeOfBirth);
    Object.assign(user, natalData);
    
    const planets = [
        { name: 'Sun', position: user.sunPosition, house: user.sunPositionHouse },
        { name: 'Moon', position: user.moonPosition, house: user.moonPositionHouse },
        { name: 'Mercury', position: user.mercuryPosition, house: user.mercuryPositionHouse },
        { name: 'Venus', position: user.venusPosition, house: user.venusPositionHouse },
        { name: 'Mars', position: user.marsPosition, house: user.marsPositionHouse },
        { name: 'Jupiter', position: user.jupiterPosition, house: user.jupiterPositionHouse },
        { name: 'Saturn', position: user.saturnPosition, house: user.saturnPositionHouse },
        { name: 'Uranus', position: user.uranusPosition, house: user.uranusPositionHouse },
        { name: 'Neptune', position: user.neptunePosition, house: user.neptunePositionHouse },
        { name: 'Pluto', position: user.plutoPosition, house: user.plutoPositionHouse },
        { name: 'True Node', position: user.trueNodePosition, house: user.trueNodePositionHouse },
        { name: 'Chiron', position: user.chironPosition, house: user.chironPositionHouse },
        { name: 'Fortuna', position: user.fortunaPosition, house: user.fortunaPositionHouse },
        { name: 'Vertex', position: user.vertexPosition, house: user.vertexPositionHouse },
        { name: 'Ascendant', position: user.ascendantPosition, house: user.ascendantPositionHouse },
        { name: 'Midheaven', position: user.midHeavenPosition, house: user.midHeavenPositionHouse }
    ];
    
    // Generate detailed natal chart in requested format
    let html = '<div style="font-family: monospace; font-size: 0.9rem; line-height: 1.6; color: white;">';
    
    // Display each planet with aspects in the specified format
    planets.forEach(planet => {
        const planetData = astrology.formatDetailedPlanetPosition(planet.name, planet.position, planet.house, user);
        html += `<div style="margin-bottom: 0.8rem; padding: 0.2rem;">${planetData}</div>`;
    });
    
    // Add house cusps section
    html += '<hr style="margin: 1.5rem 0; border-color: var(--cosmic-purple);">';
    html += '<h4 style="color: var(--cosmic-purple); margin-bottom: 1rem;">House Cusps</h4>';
    for (let i = 1; i <= 12; i++) {
        const housePosition = user.houses[(i - 1) % 12];
        const houseCusp = astrology.formatHouseCusp(i, housePosition);
        html += `<div style="margin-bottom: 0.3rem; padding: 0.1rem;">${houseCusp}</div>`;
    }
    
    html += '</div>';
    return html;
}

function closeProfile() {
    const modal = document.getElementById('profileModal');
    modal.classList.add('hidden');
}

async function editBio() {
    const bioTextarea = document.getElementById('settingsBio');
    const newBio = bioTextarea.value;
    app.currentUser.bio = newBio.substring(0, 500);
    app.saveUserData();
    network.announcePresence(app.currentUser); // Update network presence
    await showProfile(app.currentUser, true); // Refresh profile display
}

function copyNatalData(userId) {
    const user = app.matches.find(m => m.id === userId);
    const natalText = astrology.generateNatalChartText(user);
    navigator.clipboard.writeText(natalText);
}

async function copySynastryData() {
    const compatibility = await astrology.calculateCompatibility(app.currentUser, app.currentChatUser);
    const synastryText = astrology.generateSynastryText(app.currentUser, app.currentChatUser, compatibility);
    navigator.clipboard.writeText(synastryText);
}

function uploadProfileImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', (event) => {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = async (e) => {
            app.currentUser.profileImage = e.target.result;
            app.saveUserData();

            await showProfile(app.currentUser, true); // Refresh profile display
        };
        reader.readAsDataURL(file);
    });
    input.click();
}

async function recalculateNatalChart() {
    // Force recalculation of natal chart
    const natalData = await astrology.calculateNatalChart(
        app.currentUser.dateOfBirth, 
        app.currentUser.timeOfBirth, 
        app.currentUser.placeOfBirth
    );
    
    // Update user data with new calculations
    Object.assign(app.currentUser, natalData);
    
    // Update network presence
    network.announcePresence(app.currentUser);
    
    // Refresh profile display
    await showProfile(app.currentUser, true);
}

// Notification functions
function toggleNotifications() {
    const modal = document.getElementById('notificationModal');
    const list = document.getElementById('notificationsList');
    
    // Mark all as read
    app.notifications.forEach(n => n.read = true);
    app.updateNotificationBell();
    
    // Display notifications
    const html = app.notifications.map(createNotificationHTML).join('');
    
    list.innerHTML = html;
    modal.classList.remove('hidden');
}

function createNotificationHTML(notification) {
    const time = notification.timestamp.toLocaleTimeString();
    const isRequest = notification.type === 'chat_request';
    
    return `
        <div style="border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 0.5rem; padding: 1rem; margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong>${notification.from.username}@${notification.from.ipAddress}</strong>
                    <span style="color: var(--text-muted);"> ${notification.message}</span>
                </div>
                <span style="font-size: 0.8rem; color: var(--text-muted);">${time}</span>
            </div>
            ${isRequest ? `
                <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                    <button class="copy-btn" onclick="acceptChatRequest('${notification.from.id}')">OPEN</button>
                    <button class="copy-btn" onclick="ignoreChatRequest('${notification.from.ipAddress}')">IGNORE</button>
                </div>
            ` : ''}
        </div>
    `;
}

function acceptChatRequest(userId) {
    closeNotifications();
    openChat(userId);
}

function ignoreChatRequest(ipAddress) {
    app.muteIP(ipAddress);
    closeNotifications();
}

function closeNotifications() {
    const modal = document.getElementById('notificationModal');
    modal.classList.add('hidden');
}

// Location autocomplete functionality - moved to global initialization
let locationTimeout;

function initializeLocationAutocomplete() {
    const welcomeInput = document.getElementById('placeOfBirth');
    const welcomeBox = document.getElementById('locationSuggestions');
    if (welcomeInput && welcomeBox) {
        bindAutocomplete(welcomeInput, welcomeBox);
    }

    const settingsInput = document.getElementById('settingsPlaceOfBirth');
    const settingsBox = document.getElementById('settingsLocationSuggestions');
    if (settingsInput && settingsBox) {
        bindAutocomplete(settingsInput, settingsBox);
    }
}

function bindAutocomplete(input, box) {
    console.log('Binding autocomplete for input:', input.id);
    let timer;
    let isDropdownVisible = false;
    
    input.addEventListener('input', e => {
        clearTimeout(timer);
        const q = e.target.value.trim();
        console.log('Location input:', q);
        if (q.length < 2) { 
            box.classList.add('hidden'); 
            isDropdownVisible = false;
            return; 
        }
        timer = setTimeout(async () => {
            try {
                console.log('Searching for locations:', q);
                
                // First try fallback suggestions immediately for testing
                const fallbackSuggestions = getFallbackSuggestions(q);
                console.log('Fallback suggestions:', fallbackSuggestions);
                showLocationSuggestions(fallbackSuggestions, box, input);
                isDropdownVisible = true;
                
                // Then try the API call
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`,
                    {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'User-Agent': 'Searchster/1.0'
                        }
                    }
                );
                
                console.log('API response status:', res.status);
                console.log('API response headers:', res.headers);
                
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                
                const data = await res.json();
                console.log('Location search results:', data);
                const suggestions = data.map(item => ({
                    display_name: item.display_name,
                    lat: item.lat,
                    lon: item.lon
                }));
                showLocationSuggestions(suggestions, box, input);
                isDropdownVisible = true;
            } catch (error) {
                console.log('Location search error:', error);
                console.log('Error details:', error.message);
                // Fallback suggestions are already shown above
            }
        }, 300);
    });
    
    // Improved blur handling
    input.addEventListener('blur', (e) => {
        // Check if the blur is due to clicking on a suggestion
        const relatedTarget = e.relatedTarget;
        if (relatedTarget && relatedTarget.classList.contains('location-suggestion')) {
            return;
        }
        
        setTimeout(() => {
            box.classList.add('hidden');
        }, 200);
    });
    
    // Prevent dropdown from hiding when clicking inside it
    box.addEventListener('mousedown', (e) => {
        e.preventDefault();
    });
}

// Fallback suggestions for common cities
function getFallbackSuggestions(query) {
    const commonCities = [
        // Major US Cities
        { display_name: 'New York, NY, USA', lat: '40.7128', lon: '-74.0060' },
        { display_name: 'Los Angeles, CA, USA', lat: '34.0522', lon: '-118.2437' },
        { display_name: 'Chicago, IL, USA', lat: '41.8781', lon: '-87.6298' },
        { display_name: 'Houston, TX, USA', lat: '29.7604', lon: '-95.3698' },
        { display_name: 'Phoenix, AZ, USA', lat: '33.4484', lon: '-112.0740' },
        { display_name: 'Philadelphia, PA, USA', lat: '39.9526', lon: '-75.1652' },
        { display_name: 'San Antonio, TX, USA', lat: '29.4241', lon: '-98.4936' },
        { display_name: 'San Diego, CA, USA', lat: '32.7157', lon: '-117.1611' },
        { display_name: 'Dallas, TX, USA', lat: '32.7767', lon: '-96.7970' },
        { display_name: 'San Jose, CA, USA', lat: '37.3382', lon: '-121.8863' },
        { display_name: 'Austin, TX, USA', lat: '30.2672', lon: '-97.7431' },
        { display_name: 'Jacksonville, FL, USA', lat: '30.3322', lon: '-81.6557' },
        { display_name: 'Fort Worth, TX, USA', lat: '32.7555', lon: '-97.3308' },
        { display_name: 'Columbus, OH, USA', lat: '39.9612', lon: '-82.9988' },
        { display_name: 'Charlotte, NC, USA', lat: '35.2271', lon: '-80.8431' },
        { display_name: 'San Francisco, CA, USA', lat: '37.7749', lon: '-122.4194' },
        { display_name: 'Indianapolis, IN, USA', lat: '39.7684', lon: '-86.1581' },
        { display_name: 'Seattle, WA, USA', lat: '47.6062', lon: '-122.3321' },
        { display_name: 'Denver, CO, USA', lat: '39.7392', lon: '-104.9903' },
        { display_name: 'Washington, DC, USA', lat: '38.9072', lon: '-77.0369' },
        
        // Major International Cities
        { display_name: 'London, UK', lat: '51.5074', lon: '-0.1278' },
        { display_name: 'Paris, France', lat: '48.8566', lon: '2.3522' },
        { display_name: 'Berlin, Germany', lat: '52.5200', lon: '13.4050' },
        { display_name: 'Madrid, Spain', lat: '40.4168', lon: '-3.7038' },
        { display_name: 'Rome, Italy', lat: '41.9028', lon: '12.4964' },
        { display_name: 'Barcelona, Spain', lat: '41.3851', lon: '2.1734' },
        { display_name: 'Amsterdam, Netherlands', lat: '52.3676', lon: '4.9041' },
        { display_name: 'Vienna, Austria', lat: '48.2082', lon: '16.3738' },
        { display_name: 'Prague, Czech Republic', lat: '50.0755', lon: '14.4378' },
        { display_name: 'Budapest, Hungary', lat: '47.4979', lon: '19.0402' },
        { display_name: 'Warsaw, Poland', lat: '52.2297', lon: '21.0122' },
        { display_name: 'Moscow, Russia', lat: '55.7558', lon: '37.6176' },
        { display_name: 'Istanbul, Turkey', lat: '41.0082', lon: '28.9784' },
        { display_name: 'Dubai, UAE', lat: '25.2048', lon: '55.2708' },
        { display_name: 'Tokyo, Japan', lat: '35.6762', lon: '139.6503' },
        { display_name: 'Beijing, China', lat: '39.9042', lon: '116.4074' },
        { display_name: 'Shanghai, China', lat: '31.2304', lon: '121.4737' },
        { display_name: 'Seoul, South Korea', lat: '37.5665', lon: '126.9780' },
        { display_name: 'Mumbai, India', lat: '19.0760', lon: '72.8777' },
        { display_name: 'Delhi, India', lat: '28.7041', lon: '77.1025' },
        { display_name: 'Bangkok, Thailand', lat: '13.7563', lon: '100.5018' },
        { display_name: 'Singapore', lat: '1.3521', lon: '103.8198' },
        { display_name: 'Sydney, Australia', lat: '-33.8688', lon: '151.2093' },
        { display_name: 'Melbourne, Australia', lat: '-37.8136', lon: '144.9631' },
        { display_name: 'Toronto, Canada', lat: '43.6532', lon: '-79.3832' },
        { display_name: 'Vancouver, Canada', lat: '49.2827', lon: '-123.1207' },
        { display_name: 'Montreal, Canada', lat: '45.5017', lon: '-73.5673' },
        { display_name: 'Mexico City, Mexico', lat: '19.4326', lon: '-99.1332' },
        { display_name: 'São Paulo, Brazil', lat: '-23.5505', lon: '-46.6333' },
        { display_name: 'Buenos Aires, Argentina', lat: '-34.6118', lon: '-58.3960' },
        { display_name: 'Lima, Peru', lat: '-12.0464', lon: '-77.0428' },
        { display_name: 'Bogotá, Colombia', lat: '4.7110', lon: '-74.0721' },
        { display_name: 'Santiago, Chile', lat: '-33.4489', lon: '-70.6693' },
        { display_name: 'Cape Town, South Africa', lat: '-33.9249', lon: '18.4241' },
        { display_name: 'Johannesburg, South Africa', lat: '-26.2041', lon: '28.0473' },
        { display_name: 'Cairo, Egypt', lat: '30.0444', lon: '31.2357' },
        { display_name: 'Lagos, Nigeria', lat: '6.5244', lon: '3.3792' },
        { display_name: 'Nairobi, Kenya', lat: '-1.2921', lon: '36.8219' }
    ];
    
    const queryLower = query.toLowerCase();
    const filtered = commonCities.filter(city => 
        city.display_name.toLowerCase().includes(queryLower)
    );
    
    // Sort by relevance (exact matches first, then partial matches)
    const exactMatches = filtered.filter(city => 
        city.display_name.toLowerCase().startsWith(queryLower)
    );
    const partialMatches = filtered.filter(city => 
        !city.display_name.toLowerCase().startsWith(queryLower)
    );
    
    return [...exactMatches, ...partialMatches].slice(0, 8);
}

// Show location suggestions
function showLocationSuggestions(suggestions, suggestionsDiv, inputElement) {
    console.log('Showing suggestions:', suggestions);
    console.log('Suggestions div:', suggestionsDiv);
    console.log('Input element:', inputElement);
    
    // Critical functionality: handle all suggestion states properly
    if (!suggestions || suggestions.length === 0) {
        console.log('No suggestions to show, hiding dropdown');
        suggestionsDiv.classList.add('hidden');
        return;
    }
    
    const html = suggestions.map(suggestion => 
        `<div class="location-suggestion" data-location="${suggestion.display_name}">
            ${suggestion.display_name}
         </div>`
    ).join('');
    
    console.log('Generated HTML:', html);
    suggestionsDiv.innerHTML = html;
    
    // Add click handlers
    suggestionsDiv.querySelectorAll('.location-suggestion').forEach(item => {
        console.log('Adding click handler to:', item.textContent);
        item.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Location selected:', item.dataset.location);
            selectLocation(item.dataset.location, inputElement, suggestionsDiv);
        });
    });
    
    // Show suggestions
    if (suggestions.length > 0) {
        console.log('Showing suggestions dropdown');
        suggestionsDiv.classList.remove('hidden');
        console.log('Dropdown should now be visible');
    }
}

// Helper function to select a location
function selectLocation(locationName, inputElement, suggestionsDiv) {
    console.log('Selecting location:', locationName);
    
    // Update input value
    inputElement.value = locationName;
    
    // Hide dropdown immediately
    suggestionsDiv.classList.add('hidden');
    
    // Focus back to input after a short delay
    setTimeout(() => {
        inputElement.focus();
    }, 50);
    
    console.log('Location selection completed');
}

// Settings management
function openSettings() {
    const modal = document.getElementById('settingsModal');
    const setElementValue = (id, value, isCheckbox = false) => {
        const element = document.getElementById(id);
        element[isCheckbox ? 'checked' : 'value'] = value;
    };
    
    setElementValue('settingsUsername', app.currentUser.username);
    setElementValue('settingsDateOfBirth', app.currentUser.dateOfBirth);
    setElementValue('settingsTimeOfBirth', app.currentUser.timeOfBirth);
    setElementValue('settingsPlaceOfBirth', app.currentUser.placeOfBirth);
    setElementValue('settingsGender', app.currentUser.gender);
    setElementValue('settingsTimeCertain', app.currentUser.timeCertain, true);
    setElementValue('settingsLookingForMen', app.currentUser.lookingForMen, true);
    setElementValue('settingsLookingForWomen', app.currentUser.lookingForWomen, true);
    setElementValue('settingsBio', app.currentUser.bio);
    
    modal.classList.remove('hidden');
}

// Verification functions
function closeVerification() {
    const modal = document.getElementById('verificationModal');
    modal.classList.add('hidden');
}

function showVerificationModal(natalChart, userData) {
    const modal = document.getElementById('verificationModal');
    const content = document.getElementById('verificationContent');
    
    // Known reference values for verification
    const referenceValues = {
        '1985-09-15T00:24': {
            location: 'Fresno, CA, USA',
            coords: { lat: 36.7378, lon: -119.7871 },
            expected: {
                Sun: 152.5, // 2°32' Virgo
                Moon: 62.0,  // 2°00' Gemini
                Mercury: 165.2, // 15°12' Virgo
                Venus: 178.3,   // 28°18' Virgo
                Mars: 145.8,    // 25°48' Leo
                Jupiter: 0.5,   // 0°30' Aquarius
                Saturn: 15.2,   // 15°12' Scorpio
                Ascendant: 207.0, // 27°00' Libra
                MC: 117.0,      // 27°00' Cancer
                Fortuna: 62.0   // 2°00' Gemini
            }
        }
    };
    
    const birthKey = `${userData.dateOfBirth}T${userData.timeOfBirth}`;
    const reference = referenceValues[birthKey];
    
    let html = `
        <h4 style="color: var(--cosmic-pink); margin-bottom: 1rem;">📊 Calculation Results</h4>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div>
                <strong>Birth Data:</strong><br>
                Date: ${userData.dateOfBirth}<br>
                Time: ${userData.timeOfBirth}<br>
                Location: ${userData.placeOfBirth}<br>
                Coordinates: ${natalChart.coordinates?.lat || 'N/A'}, ${natalChart.coordinates?.lon || 'N/A'}
            </div>
            <div>
                <strong>Calculation Method:</strong><br>
                Swiss Ephemeris: ${natalChart.swephAvailable ? '✅ Available' : '❌ Not Available'}<br>
                Ayanamsa: Fagan/Bradley (Sidereal)<br>
                House System: Placidus<br>
                Julian Day: ${natalChart.julianDay?.toFixed(6) || 'N/A'}
            </div>
        </div>
        
        <h5 style="color: var(--cosmic-purple); margin: 1rem 0;">Planetary Positions</h5>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.5rem; margin-bottom: 1rem;">
    `;
    
    // Display planetary positions
    const planets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'TrueNode', 'Chiron'];
    
    planets.forEach(planet => {
        const position = natalChart[planet];
        const degree = position ? position % 30 : 0;
        const sign = getZodiacSign(position);
        const minutes = Math.floor((degree % 1) * 60);
        const seconds = Math.floor(((degree % 1) * 60 % 1) * 60);
        
        let verificationStatus = '';
        if (reference && reference.expected[planet]) {
            const expected = reference.expected[planet];
            const actual = position;
            const difference = Math.abs(actual - expected);
            const isAccurate = difference < 2; // Within 2 degrees
            verificationStatus = `
                <br><small style="color: ${isAccurate ? 'green' : 'orange'};">
                    Expected: ${expected.toFixed(1)}° (${difference.toFixed(1)}° diff)
                </small>
            `;
        }
        
        html += `
            <div style="background: rgba(139, 92, 246, 0.1); padding: 0.5rem; border-radius: 0.25rem;">
                <strong>${planet}:</strong> ${position ? position.toFixed(2) : 'N/A'}°<br>
                <small>${sign} ${degree.toFixed(0)}°${minutes}'${seconds}"</small>
                ${verificationStatus}
            </div>
        `;
    });
    
    html += `
        </div>
        
        <h5 style="color: var(--cosmic-purple); margin: 1rem 0;">Angular Points</h5>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.5rem; margin-bottom: 1rem;">
    `;
    
    // Display angular points
    const angles = ['Ascendant', 'MC', 'Fortuna', 'Vertex'];
    angles.forEach(angle => {
        const position = natalChart[angle];
        const degree = position ? position % 30 : 0;
        const sign = getZodiacSign(position);
        const minutes = Math.floor((degree % 1) * 60);
        const seconds = Math.floor(((degree % 1) * 60 % 1) * 60);
        
        let verificationStatus = '';
        if (reference && reference.expected[angle]) {
            const expected = reference.expected[angle];
            const actual = position;
            const difference = Math.abs(actual - expected);
            const isAccurate = difference < 2;
            verificationStatus = `
                <br><small style="color: ${isAccurate ? 'green' : 'orange'};">
                    Expected: ${expected.toFixed(1)}° (${difference.toFixed(1)}° diff)
                </small>
            `;
        }
        
        html += `
            <div style="background: rgba(139, 92, 246, 0.1); padding: 0.5rem; border-radius: 0.25rem;">
                <strong>${angle}:</strong> ${position ? position.toFixed(2) : 'N/A'}°<br>
                <small>${sign} ${degree.toFixed(0)}°${minutes}'${seconds}"</small>
                ${verificationStatus}
            </div>
        `;
    });
    
    html += `
        </div>
        
        <div style="background: rgba(139, 92, 246, 0.1); padding: 1rem; border-radius: 0.5rem; margin-top: 1rem;">
            <h6 style="color: var(--cosmic-purple); margin-bottom: 0.5rem;">🔍 Verification Summary</h6>
            <p style="margin: 0; font-size: 0.9rem;">
                ${reference ? 
                    '✅ Comparing with known reference values for September 15, 1985, 00:24, Fresno, CA' :
                    'ℹ️ No reference data available for this birth time. Calculations are based on Swiss Ephemeris algorithms.'
                }
            </p>
            ${reference ? `
                <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">
                    <strong>Accuracy:</strong> ${Object.keys(reference.expected).filter(planet => {
                        const actual = natalChart[planet];
                        const expected = reference.expected[planet];
                        return actual && Math.abs(actual - expected) < 2;
                    }).length}/${Object.keys(reference.expected).length} positions within 2° tolerance
                </p>
            ` : ''}
        </div>
    `;
    
    content.innerHTML = html;
    modal.classList.remove('hidden');
}

// Helper function to get zodiac sign
function getZodiacSign(degree) {
    if (!degree) return 'N/A';
    const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 
                   'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    const signIndex = Math.floor(degree / 30);
    return signs[signIndex];
}

function closeSettings() {
    const modal = document.getElementById('settingsModal');
    modal.classList.add('hidden');
}

async function saveSettings() {
    // Get new values
    const elements = {
        username: document.getElementById('settingsUsername'),
        dateOfBirth: document.getElementById('settingsDateOfBirth'),
        timeOfBirth: document.getElementById('settingsTimeOfBirth'),
        placeOfBirth: document.getElementById('settingsPlaceOfBirth'),
        gender: document.getElementById('settingsGender'),
        timeCertain: document.getElementById('settingsTimeCertain'),
        lookingForMen: document.getElementById('settingsLookingForMen'),
        lookingForWomen: document.getElementById('settingsLookingForWomen'),
        bio: document.getElementById('settingsBio')
    };
    
    const newUsername = elements.username.value.trim();
    const newDateOfBirth = elements.dateOfBirth.value;
    const newTimeOfBirth = elements.timeOfBirth.value;
    const newPlaceOfBirth = elements.placeOfBirth.value;
    const newGender = elements.gender.value;
    const newTimeCertain = elements.timeCertain.checked;
    const newLookingForMen = elements.lookingForMen.checked;
    const newLookingForWomen = elements.lookingForWomen.checked;
    const newBio = elements.bio.value.trim();
    
    // No validation - proceed directly
    
    // Update user data
    const oldData = { ...app.currentUser };
    app.currentUser.username = newUsername;
    app.currentUser.dateOfBirth = newDateOfBirth;
    app.currentUser.timeOfBirth = newTimeOfBirth;
    app.currentUser.placeOfBirth = newPlaceOfBirth;
    app.currentUser.gender = newGender;
    app.currentUser.timeCertain = newTimeCertain;
    app.currentUser.lookingForMen = newLookingForMen;
    app.currentUser.lookingForWomen = newLookingForWomen;
    app.currentUser.bio = newBio.substring(0, 500);
    
    // Recalculate astrological data if birth info changed
    const natalChart = await astrology.calculateNatalChart(newDateOfBirth, newTimeOfBirth, newPlaceOfBirth);
    // Update all planetary positions
    Object.assign(app.currentUser, natalChart);
    
    // Update display name
    app.currentUser.displayName = `${app.currentUser.username}@${app.currentUser.ipAddress}`;
    
    // Save and announce changes
    app.saveUserData();
    network.announcePresence(app.currentUser);
    
    // Close modal
    closeSettings();
    
    // Refresh matches if on matches screen
    const matchesScreen = document.getElementById('matchesScreen');
    findMatches();
}