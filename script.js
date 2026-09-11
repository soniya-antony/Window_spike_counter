document.addEventListener('DOMContentLoaded', () => {
    // --- STATE & LOCAL STORAGE ---
    let state = {
        windowsInspected: 0,
        totalSpikes: 0,
        highestSpikes: 0,
        bestScore: 0,
        history: [],
        achievements: {
            first: false,
            enthusiast: false,
            collector: false,
            overload: false,
            why: false,
            supreme: false
        }
    };

    function loadState() {
        try {
            const saved = localStorage.getItem('windowSpikesState');
            if (saved) {
                const parsed = JSON.parse(saved);
                state = {
                    ...state,
                    ...parsed,
                    achievements: { ...state.achievements, ...(parsed.achievements || {}) }
                };
            }
        } catch (e) {
            console.warn('Could not read from localStorage:', e);
        }
        updateProfileUI();
        updateStatsUI();
        renderHistory();
        renderAchievements();
        updateUselessness();
    }

    function saveState() {
        try {
            localStorage.setItem('windowSpikesState', JSON.stringify(state));
        } catch (e) {
            console.warn('Could not save to localStorage:', e);
        }
    }

    // --- DOM ELEMENTS ---
    const pages = document.querySelectorAll('.page');
    const navBtns = document.querySelectorAll('.nav-btn');
    
    // Home Page
    const imageUpload = document.getElementById('imageUpload');
    const useExampleBtn = document.getElementById('useExampleBtn');
    const imagePreview = document.getElementById('imagePreview');
    const placeholderText = document.getElementById('placeholderText');
    const countSpikesBtn = document.getElementById('countSpikesBtn');
    
    // Result Page
    const resultSpikeCount = document.getElementById('resultSpikeCount');
    const resultScore = document.getElementById('resultScore');
    const scoreDesc = document.getElementById('scoreDesc');
    const resultPersonality = document.getElementById('resultPersonality');
    const personalityDesc = document.getElementById('personalityDesc');
    const resultMessage = document.getElementById('resultMessage');
    const countAnotherBtn = document.getElementById('countAnotherBtn');
    const copyResultBtn = document.getElementById('copyResultBtn');
    const shareResultBtn = document.getElementById('shareResultBtn');
    const copyConfirm = document.getElementById('copyConfirm');
    const resultProfileUser = document.getElementById('resultProfileUser');
    const resultProfileRank = document.getElementById('resultProfileRank');
    const resultUselessness = document.getElementById('resultUselessness');
    
    // Stats Page
    const profileUsername = document.getElementById('profileUsername');
    const profileRank = document.getElementById('profileRank');
    const uselessnessPercent = document.getElementById('uselessnessPercent');
    const uselessnessBar = document.getElementById('uselessnessBar');
    const statWindows = document.getElementById('statWindows');
    const statTotalSpikes = document.getElementById('statTotalSpikes');
    const statHighestSpikes = document.getElementById('statHighestSpikes');
    const statAverageSpikes = document.getElementById('statAverageSpikes');
    const statBestScore = document.getElementById('statBestScore');
    const leaderboardList = document.getElementById('leaderboardList');
    
    // Achievements & History
    const achievementsGrid = document.getElementById('achievementsGrid');
    const historyList = document.getElementById('historyList');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    
    // Processing
    const processingText = document.getElementById('processingText');

    let currentImageSrc = null;
    let currentResult = null;

    // --- NAVIGATION ---
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-target');
            navigateTo(target);
        });
    });

    function navigateTo(pageId) {
        pages.forEach(page => page.classList.remove('active'));
        navBtns.forEach(btn => btn.classList.remove('active'));
        
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // Only add active to nav if this page actually has a corresponding nav button
        const activeNavBtn = document.querySelector(`[data-target="${pageId}"]`);
        if (activeNavBtn) {
            activeNavBtn.classList.add('active');
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // --- USERNAME & PROFILE ---
    function getUsername() {
        const names = [
            "Window Explorer",
            "Spike Detective",
            "Window Warrior",
            "Grill Inspector",
            "Certified Spike Counter",
            "Window Goblin"
        ];
        try {
            let savedName = localStorage.getItem('windowSpikesUsername');
            if (!savedName) {
                savedName = names[Math.floor(Math.random() * names.length)];
                localStorage.setItem('windowSpikesUsername', savedName);
            }
            return savedName;
        } catch (e) {
            return "Window Explorer";
        }
    }

    function calculateRank(windowsCount) {
        if (windowsCount >= 20) return "Supreme Spike Overlord";
        if (windowsCount >= 10) return "Certified Spike Analyst";
        if (windowsCount >= 5) return "Window Detective";
        if (windowsCount >= 3) return "Spike Enthusiast";
        if (windowsCount >= 1) return "Casual Counter";
        return "Window Intern";
    }

    function calculateUselessness(windowsCount) {
        if (windowsCount === 0) return 0;
        if (windowsCount === 1) return 65;
        if (windowsCount === 2) return 75;
        if (windowsCount === 3) return 82;
        if (windowsCount === 4) return 88;
        if (windowsCount === 5) return 94;
        if (windowsCount >= 10) return 100;
        return 99; // 6 to 9 windows
    }

    // --- IMAGE SELECTION ---
    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                alert("Hmm. This doesn't look like a window image. Try another picture! 🪟");
                return;
            }
            const reader = new FileReader();
            reader.onload = function(event) {
                setPreviewImage(event.target.result);
            };
            reader.onerror = function() {
                alert("Failed to load your window picture. Please try another image! 🪟");
            };
            reader.readAsDataURL(file);
        }
    });

    useExampleBtn.addEventListener('click', () => {
        setPreviewImage('images/window.jpg');
    });

    function setPreviewImage(src) {
        currentImageSrc = src;
        imagePreview.src = src;
        imagePreview.style.display = 'block';
        placeholderText.style.display = 'none';
        countSpikesBtn.classList.remove('disabled');
    }

    function resetHome() {
        currentImageSrc = null;
        imagePreview.src = '';
        imagePreview.style.display = 'none';
        placeholderText.style.display = 'flex';
        countSpikesBtn.classList.add('disabled');
        imageUpload.value = '';
    }

    // --- SPIKE DETECTION ENGINE (CANVAS WITH SAFE FALLBACK) ---
    function fallbackSpikeCount(src) {
        if (!src || src.includes('images/window.jpg')) {
            return 14;
        }
        let hash = 0;
        for (let i = 0; i < src.length; i++) {
            hash = (hash << 5) - hash + src.charCodeAt(i);
            hash |= 0;
        }
        return 6 + (Math.abs(hash) % 36); // 6 to 41 spikes
    }

    function detectSpikesFromImage(imgElement) {
        return new Promise((resolve) => {
            try {
                if (!imgElement || !imgElement.src) {
                    return resolve(fallbackSpikeCount(''));
                }

                // If it's the example image, we know it has 14 spikes
                if (imgElement.src.includes('images/window.jpg')) {
                    return resolve(14);
                }

                const img = new Image();
                img.crossOrigin = "Anonymous";

                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d', { willReadFrequently: true });
                        if (!ctx) return resolve(fallbackSpikeCount(imgElement.src));

                        const width = 320;
                        const scale = width / (img.naturalWidth || img.width || 320);
                        const height = Math.max(100, Math.round((img.naturalHeight || img.height || 240) * scale));
                        canvas.width = width;
                        canvas.height = height;

                        ctx.drawImage(img, 0, 0, width, height);
                        const imgData = ctx.getImageData(0, 0, width, height);
                        const data = imgData.data;

                        // Scan middle vertical section where bars/grills are prominent
                        const startY = Math.floor(height * 0.25);
                        const endY = Math.floor(height * 0.75);
                        const sampleRows = endY - startY;

                        const colGradients = new Float32Array(width);
                        for (let x = 1; x < width - 1; x++) {
                            let totalGrad = 0;
                            for (let y = startY; y < endY; y += 2) {
                                const idx = (y * width + x) * 4;
                                const idxLeft = (y * width + (x - 1)) * 4;
                                const idxRight = (y * width + (x + 1)) * 4;

                                const lumLeft = 0.299 * data[idxLeft] + 0.587 * data[idxLeft + 1] + 0.114 * data[idxLeft + 2];
                                const lumRight = 0.299 * data[idxRight] + 0.587 * data[idxRight + 1] + 0.114 * data[idxRight + 2];

                                totalGrad += Math.abs(lumRight - lumLeft);
                            }
                            colGradients[x] = totalGrad / (sampleRows / 2);
                        }

                        // Smooth gradient values
                        const smoothed = new Float32Array(width);
                        for (let x = 2; x < width - 2; x++) {
                            smoothed[x] = (colGradients[x - 2] + 2 * colGradients[x - 1] + 3 * colGradients[x] + 2 * colGradients[x + 1] + colGradients[x + 2]) / 9;
                        }

                        let sum = 0;
                        for (let x = 0; x < width; x++) sum += smoothed[x];
                        const mean = sum / width;

                        let variance = 0;
                        for (let x = 0; x < width; x++) variance += (smoothed[x] - mean) ** 2;
                        const stdDev = Math.sqrt(variance / width);

                        const threshold = mean + stdDev * 0.65;
                        let peaks = 0;
                        let lastPeakX = -20;
                        const minDistance = Math.max(6, Math.floor(width * 0.03));

                        for (let x = 6; x < width - 6; x++) {
                            if (smoothed[x] > threshold &&
                                smoothed[x] >= smoothed[x - 1] &&
                                smoothed[x] >= smoothed[x + 1] &&
                                (x - lastPeakX) >= minDistance) {
                                peaks++;
                                lastPeakX = x;
                            }
                        }

                        let detected = Math.round(peaks / 1.5);
                        if (detected <= 1 && peaks > 0) detected = peaks;
                        if (detected <= 0) detected = fallbackSpikeCount(imgElement.src);
                        detected = Math.min(55, Math.max(2, detected));

                        resolve(detected);
                    } catch (e) {
                        console.warn("Canvas analysis fallback triggered:", e);
                        resolve(fallbackSpikeCount(imgElement.src));
                    }
                };

                img.onerror = () => {
                    console.warn("Image load error during analysis, using fallback");
                    resolve(fallbackSpikeCount(imgElement.src));
                };

                img.src = imgElement.src;
            } catch (e) {
                console.warn("Spike detection error, using fallback:", e);
                resolve(fallbackSpikeCount(imgElement.src));
            }
        });
    }

    // --- PROCESSING & COUNTING FLOW ---
    countSpikesBtn.addEventListener('click', async () => {
        if (!currentImageSrc) {
            alert("Please select or upload a window image first! 🪟");
            return;
        }
        
        navigateTo('processing');

        // Loading step animation (3.2 seconds total)
        const animationPromise = new Promise((resolve) => {
            processingText.innerText = "Inspecting your window...";
            setTimeout(() => {
                processingText.innerText = "Counting spikes...";
            }, 1100);
            setTimeout(() => {
                processingText.innerText = "Questioning my life choices...";
            }, 2200);
            setTimeout(() => {
                resolve();
            }, 3200);
        });

        const detectionPromise = detectSpikesFromImage(imagePreview);

        try {
            const [_, detectedSpikes] = await Promise.all([animationPromise, detectionPromise]);
            const result = calculateResult(detectedSpikes);
            showResult(result);
        } catch (err) {
            console.error("Counting error, executing safe fallback:", err);
            const fallback = fallbackSpikeCount(currentImageSrc);
            const result = calculateResult(fallback);
            showResult(result);
        }
    });

    function calculateResult(spikes) {
        // Exact Formula: Window Score = min(100, 20 + (2 × number of spikes))
        const score = Math.min(100, 20 + (2 * spikes));
        
        let personality = "";
        let pDesc = "";
        
        if (spikes <= 5) {
            personality = "THE MINIMALIST";
            pDesc = "Less is more.";
        } else if (spikes <= 10) {
            personality = "THE NORMAL ONE";
            pDesc = "Nothing suspicious here.";
        } else if (spikes <= 20) {
            personality = "THE SPIKE ENTHUSIAST";
            pDesc = "This window has hobbies.";
        } else if (spikes <= 30) {
            personality = "THE FORTRESS";
            pDesc = "This window clearly doesn't trust anyone.";
        } else if (spikes <= 40) {
            personality = "SERIOUS BUSINESS";
            pDesc = "We may have gone too far.";
        } else {
            personality = "THE FINAL BOSS";
            pDesc = "Please stop counting.";
        }

        let sDesc = "";
        if (score <= 39) {
            sDesc = "Your window is living a peaceful life.";
        } else if (score <= 59) {
            sDesc = "Respectable spike activity.";
        } else if (score <= 79) {
            sDesc = "Okay, that's getting serious.";
        } else if (score <= 94) {
            sDesc = "Your window is doing overtime.";
        } else {
            sDesc = "ABSOLUTELY SPIKED.";
        }

        const messages = [
            "A completely unnecessary investigation.",
            "Because apparently counting window spikes is important.",
            "Your window has been judged.",
            "This information will change absolutely nothing.",
            "That's barely a window.",
            "Honestly? Pretty respectable.",
            "That's a suspicious amount of spikes.",
            "This isn't a window anymore. It's a defensive structure.",
            "WHO BUILT THIS THING?"
        ];
        
        const rMessage = messages[Math.floor(Math.random() * messages.length)];

        const res = {
            spikes,
            score,
            personality,
            pDesc,
            sDesc,
            rMessage,
            date: new Date().toISOString()
        };

        updateStateWithResult(res);
        return res;
    }

    function updateStateWithResult(res) {
        state.windowsInspected++;
        state.totalSpikes += res.spikes;
        if (res.spikes > state.highestSpikes) state.highestSpikes = res.spikes;
        if (res.score > state.bestScore) state.bestScore = res.score;
        
        state.history.unshift(res);
        if (state.history.length > 50) state.history.pop();

        checkAchievements(res.spikes);
        saveState();
        
        // Update all UI components
        updateProfileUI();
        updateStatsUI();
        renderHistory();
        renderAchievements();
        updateUselessness();
    }

    function checkAchievements(spikes) {
        if (!state.achievements.first && state.windowsInspected >= 1) {
            unlockAchievement('first', 'FIRST INSPECTION', 'Count your first window.');
        }
        if (!state.achievements.enthusiast && spikes >= 10) {
            unlockAchievement('enthusiast', 'SPIKE ENTHUSIAST', 'Find 10 or more spikes.');
        }
        if (!state.achievements.collector && state.windowsInspected >= 3) {
            unlockAchievement('collector', 'WINDOW COLLECTOR', 'Inspect 3 windows.');
        }
        if (!state.achievements.overload && spikes >= 30) {
            unlockAchievement('overload', 'SPIKE OVERLOAD', 'Find 30 or more spikes.');
        }
        if (!state.achievements.why && state.windowsInspected >= 5) {
            unlockAchievement('why', 'WHY ARE YOU DOING THIS?', 'Inspect 5 windows.');
        }
        if (!state.achievements.supreme && state.windowsInspected >= 10) {
            unlockAchievement('supreme', 'SUPREME COUNTER', 'Inspect 10 windows.');
        }
    }

    function unlockAchievement(key, title, desc) {
        state.achievements[key] = true;
        showToast(`Unlocked: ${title}! 🏅`);
    }

    // --- UI UPDATES & RESULT DISPLAY ---
    function showResult(res) {
        currentResult = res;
        navigateTo('result');
        
        // Smooth count-up animation
        const target = res.spikes;
        resultSpikeCount.innerText = '0';
        const duration = 1200;
        const startTime = performance.now();
        
        function animateCount(now) {
            const progress = Math.min((now - startTime) / duration, 1);
            // Ease out cubic
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const currentVal = Math.floor(easeProgress * target);
            resultSpikeCount.innerText = currentVal;
            
            if (progress < 1) {
                requestAnimationFrame(animateCount);
            } else {
                resultSpikeCount.innerText = target;
            }
        }
        requestAnimationFrame(animateCount);

        resultScore.innerText = `${res.score} / 100`;
        scoreDesc.innerText = res.sDesc;
        resultPersonality.innerText = res.personality;
        personalityDesc.innerText = `"${res.pDesc}"`;
        resultMessage.innerText = res.rMessage;
        
        // Update summary strip on result card
        const username = getUsername();
        const rank = calculateRank(state.windowsInspected);
        const uselessness = calculateUselessness(state.windowsInspected);
        
        if (resultProfileUser) resultProfileUser.innerText = username;
        if (resultProfileRank) resultProfileRank.innerText = rank;
        if (resultUselessness) resultUselessness.innerText = `${uselessness}% USELESS`;

        processingText.innerText = "Inspecting your window...";
    }

    // --- RANK MODAL & PROGRESSION SYSTEM ---
    const RANK_CONFIG = [
        { rank: "Window Intern", icon: "🌱", min: 0, nextMin: 1, nextRank: "Casual Counter", reqDesc: "Inspect 0 windows", nextReqDesc: "Inspect 1 window" },
        { rank: "Casual Counter", icon: "👀", min: 1, nextMin: 3, nextRank: "Spike Enthusiast", reqDesc: "Inspect 1 window", nextReqDesc: "Inspect 3 windows" },
        { rank: "Spike Enthusiast", icon: "🌵", min: 3, nextMin: 5, nextRank: "Window Detective", reqDesc: "Inspect 3 windows", nextReqDesc: "Inspect 5 windows" },
        { rank: "Window Detective", icon: "🔍", min: 5, nextMin: 10, nextRank: "Certified Spike Analyst", reqDesc: "Inspect 5 windows", nextReqDesc: "Inspect 10 windows" },
        { rank: "Certified Spike Analyst", icon: "📊", min: 10, nextMin: 20, nextRank: "Supreme Spike Overlord", reqDesc: "Inspect 10 windows", nextReqDesc: "Inspect 20 windows" },
        { rank: "Supreme Spike Overlord", icon: "👑", min: 20, nextMin: null, nextRank: "MAX RANK REACHED 👑", reqDesc: "Inspect 20+ windows", nextReqDesc: "None (You are the ultimate Spike Overlord)" }
    ];

    function openRankModal() {
        const windows = state.windowsInspected;
        let currentConfig = RANK_CONFIG[0];
        for (let i = RANK_CONFIG.length - 1; i >= 0; i--) {
            if (windows >= RANK_CONFIG[i].min) {
                currentConfig = RANK_CONFIG[i];
                break;
            }
        }

        const modalRankIcon = document.getElementById('modalRankIcon');
        const rankModalTitle = document.getElementById('rankModalTitle');
        const modalCurrentRank = document.getElementById('modalCurrentRank');
        const modalRequirement = document.getElementById('modalRequirement');
        const modalWindowsInspected = document.getElementById('modalWindowsInspected');
        const modalNextRank = document.getElementById('modalNextRank');
        const modalNextRequirement = document.getElementById('modalNextRequirement');
        const modalProgressFraction = document.getElementById('modalProgressFraction');
        const modalProgressPercent = document.getElementById('modalProgressPercent');
        const modalProgressBarFill = document.getElementById('modalProgressBarFill');

        if (modalRankIcon) modalRankIcon.innerText = currentConfig.icon;
        if (rankModalTitle) rankModalTitle.innerText = `${currentConfig.rank.toUpperCase()}`;
        if (modalCurrentRank) modalCurrentRank.innerText = currentConfig.rank;
        if (modalRequirement) modalRequirement.innerText = currentConfig.reqDesc;
        if (modalWindowsInspected) modalWindowsInspected.innerText = windows;
        if (modalNextRank) modalNextRank.innerText = currentConfig.nextRank;
        if (modalNextRequirement) modalNextRequirement.innerText = currentConfig.nextReqDesc;

        let fractionText = "";
        let percentNum = 0;

        if (currentConfig.nextMin !== null) {
            fractionText = `${windows} / ${currentConfig.nextMin} windows`;
            percentNum = Math.min(100, Math.round((windows / currentConfig.nextMin) * 100));
            if (modalProgressPercent) modalProgressPercent.innerText = `${percentNum}% to next rank`;
        } else {
            fractionText = `${windows} / 20 windows (Max Rank)`;
            percentNum = 100;
            if (modalProgressPercent) modalProgressPercent.innerText = `100% - Maximum Rank Achieved! 👑`;
        }

        if (modalProgressFraction) modalProgressFraction.innerText = fractionText;
        if (modalProgressBarFill) {
            modalProgressBarFill.style.width = '0%';
            setTimeout(() => {
                modalProgressBarFill.style.width = `${percentNum}%`;
            }, 60);
        }

        const rankModal = document.getElementById('rankModal');
        if (rankModal) {
            rankModal.classList.add('active');
            rankModal.classList.add('open');
            const profileRankBtn = document.getElementById('profileRank') || document.getElementById('rankButton');
            if (profileRankBtn) profileRankBtn.setAttribute('aria-expanded', 'true');
        }
    }

    function closeRankModal() {
        const rankModal = document.getElementById('rankModal');
        if (rankModal) {
            rankModal.classList.remove('active');
            rankModal.classList.remove('open');
            const profileRankBtn = document.getElementById('profileRank') || document.getElementById('rankButton');
            if (profileRankBtn) profileRankBtn.setAttribute('aria-expanded', 'false');
        }
    }

    function updateProfileUI() {
        const username = getUsername();
        const rank = calculateRank(state.windowsInspected);
        if (profileUsername) profileUsername.innerText = username;
        
        const profileRankText = document.getElementById('profileRankText');
        if (profileRankText) {
            profileRankText.innerText = rank;
        } else if (profileRank) {
            profileRank.innerText = rank;
        }
    }

    function updateUselessness() {
        const pct = calculateUselessness(state.windowsInspected);
        if (uselessnessPercent) uselessnessPercent.innerText = pct;
        if (uselessnessBar) {
            setTimeout(() => {
                uselessnessBar.style.width = pct + '%';
            }, 200);
        }
    }

    function updateStatsUI() {
        if (statWindows) statWindows.innerText = state.windowsInspected;
        if (statTotalSpikes) statTotalSpikes.innerText = state.totalSpikes;
        if (statHighestSpikes) statHighestSpikes.innerText = state.highestSpikes;
        
        const avg = state.windowsInspected > 0 ? (state.totalSpikes / state.windowsInspected).toFixed(1) : "0";
        if (statAverageSpikes) statAverageSpikes.innerText = avg;
        if (statBestScore) statBestScore.innerText = `${state.bestScore}/100`;

        // Fake Leaderboard
        const fakes = [
            { name: "SpikeLord3000", s: 87 },
            { name: "WindowGoblin", s: 64 },
            { name: "GrillMaster", s: 51 },
            { name: "GlassWarrior", s: 42 }
        ];
        
        const myBest = state.highestSpikes;
        fakes.push({ name: `${getUsername()} (You)`, s: myBest, isUser: true });
        fakes.sort((a, b) => b.s - a.s);
        
        if (leaderboardList) {
            leaderboardList.innerHTML = '';
            fakes.forEach((f, i) => {
                const li = document.createElement('li');
                if (f.isUser) li.classList.add('current-user');
                li.innerHTML = `<span>${i + 1}. ${f.name}</span> <span>${f.s} spikes</span>`;
                leaderboardList.appendChild(li);
            });
        }
    }

    function renderAchievements() {
        const achList = [
            { key: 'first', title: '🔍 FIRST INSPECTION', desc: 'Count your first window.' },
            { key: 'enthusiast', title: '🌵 SPIKE ENTHUSIAST', desc: 'Find 10 or more spikes.' },
            { key: 'collector', title: '🪟 WINDOW COLLECTOR', desc: 'Inspect 3 windows.' },
            { key: 'overload', title: '🔥 SPIKE OVERLOAD', desc: 'Find 30 or more spikes.' },
            { key: 'why', title: '🤡 WHY ARE YOU DOING THIS?', desc: 'Inspect 5 windows.' },
            { key: 'supreme', title: '👑 SUPREME COUNTER', desc: 'Inspect 10 windows.' }
        ];

        if (achievementsGrid) {
            achievementsGrid.innerHTML = '';
            achList.forEach(a => {
                const isUnlocked = state.achievements[a.key];
                const div = document.createElement('div');
                div.className = `achievement ${isUnlocked ? 'unlocked' : ''}`;
                div.style.cursor = 'pointer';
                div.title = isUnlocked ? `Unlocked! Click for details.` : `Locked. Click for details.`;
                div.innerHTML = `
                    <div class="achievement-icon">${a.title.split(' ')[0]}</div>
                    <div class="achievement-title">${a.title.substring(2)}</div>
                    <p class="achievement-desc">${a.desc}</p>
                `;
                div.addEventListener('click', () => {
                    if (isUnlocked) {
                        showToast(`🏅 ${a.title.trim()}: Unlocked! "${a.desc}"`);
                    } else {
                        showToast(`🔒 ${a.title.trim()}: Locked! Requirement: ${a.desc}`);
                    }
                });
                achievementsGrid.appendChild(div);
            });
        }
    }

    function renderHistory() {
        if (!historyList) return;
        historyList.innerHTML = '';
        if (state.history.length === 0) {
            historyList.innerHTML = '<li style="padding: 1.5rem; text-align: center; color: #888;">No windows judged yet. Your life is still somewhat meaningful.</li>';
            return;
        }

        state.history.forEach((h, i) => {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.innerHTML = `
                <span>Window #${state.history.length - i}</span>
                <span class="count">${h.spikes} spikes</span>
                <span class="score">${h.score}/100</span>
            `;
            historyList.appendChild(li);
        });
    }

    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            if (confirm("Are you sure you want to erase your window history?")) {
                state.history = [];
                saveState();
                renderHistory();
            }
        });
    }

    // COUNT ANOTHER WINDOW BUTTON
    if (countAnotherBtn) {
        countAnotherBtn.addEventListener('click', () => {
            resetHome();
            navigateTo('home');
        });
    }

    // --- ACTIONS: COPY & SHARE ---
    function copyTextToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        }
        // Fallback for older browsers
        return new Promise((resolve, reject) => {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.opacity = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                if (successful) resolve();
                else reject(new Error("execCommand failed"));
            } catch (err) {
                document.body.removeChild(textArea);
                reject(err);
            }
        });
    }

    if (copyResultBtn) {
        copyResultBtn.addEventListener('click', () => {
            if (!currentResult) return;
            const text = `I counted ${currentResult.spikes} spikes in a window and got a Window Score of ${currentResult.score}/100. Completely useless information. 🪟`;
            copyTextToClipboard(text).then(() => {
                if (copyConfirm) {
                    copyConfirm.style.opacity = '1';
                    setTimeout(() => { copyConfirm.style.opacity = '0'; }, 2500);
                }
            }).catch(err => {
                console.error('Failed to copy:', err);
                alert(text);
            });
        });
    }

    if (shareResultBtn) {
        shareResultBtn.addEventListener('click', () => {
            if (!currentResult) return;
            const text = `I just counted ${currentResult.spikes} spikes in a window. My Window Score is ${currentResult.score}/100. I have no idea why I did this.`;
            if (navigator.share) {
                navigator.share({
                    title: 'How Many Spikes in Your Window?',
                    text: text,
                    url: window.location.href
                }).catch(err => {
                    if (err.name !== 'AbortError') {
                        console.warn('Share error:', err);
                        copyResultBtn.click();
                    }
                });
            } else {
                copyResultBtn.click();
            }
        });
    }

    function showToast(msg) {
        const toast = document.getElementById('toast');
        const toastMsg = document.getElementById('toastMessage');
        if (toast && toastMsg) {
            toastMsg.innerText = msg;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3500);
        }
    }

    // --- RANK MODAL LISTENERS ---
    const rankButtons = [
        document.getElementById('profileRank'),
        document.getElementById('rankButton'),
        document.getElementById('resultRankPill')
    ];
    rankButtons.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', openRankModal);
            btn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openRankModal();
                }
            });
        }
    });

    const closeButtons = [
        document.getElementById('closeRankModalBtn'),
        document.getElementById('closeRankModal'),
        document.getElementById('modalDismissBtn')
    ];
    closeButtons.forEach(btn => {
        if (btn) btn.addEventListener('click', closeRankModal);
    });

    const modalBackdrop = document.getElementById('modalBackdrop');
    if (modalBackdrop) {
        modalBackdrop.addEventListener('click', closeRankModal);
    }

    const rankModal = document.getElementById('rankModal');
    if (rankModal) {
        rankModal.addEventListener('click', (e) => {
            if (e.target === rankModal) {
                closeRankModal();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeRankModal();
        }
    });

    // --- INTERACTIVE STAT CARDS & METERS ---
    const statCardTooltips = {
        "Windows Inspected": "Total window apertures scrutinized in this session. 🪟",
        "Total Spikes Counted": "Sum total of all vertical metal bars ever cataloged! 🌵",
        "Highest Spike Count": "Your most fortified window discovery so far. 🏰",
        "Average Spike Count": "Average spike density per inspected window frame. 📊",
        "Best Window Score": "Peak score achieved using: min(100, 20 + (2 × spikes)). ⭐"
    };

    document.querySelectorAll('.stat-card').forEach(card => {
        card.addEventListener('click', () => {
            const titleEl = card.querySelector('p');
            const valEl = card.querySelector('h3');
            if (titleEl && valEl) {
                const label = titleEl.innerText.trim();
                const tip = statCardTooltips[label] || `${label}: ${valEl.innerText}`;
                showToast(`${tip}`);
            }
        });
    });

    const uselessnessCard = document.querySelector('.uselessness-meter');
    if (uselessnessCard) {
        uselessnessCard.style.cursor = 'pointer';
        uselessnessCard.title = "Click to inspect uselessness details";
        uselessnessCard.addEventListener('click', () => {
            const pct = calculateUselessness(state.windowsInspected);
            showToast(`🤡 ${pct}% Useless! 100% committed to zero practical application.`);
        });
    }

    // Initialize application state on page load
    loadState();
});
