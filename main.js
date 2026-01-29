/* --- CONFIG & CONSTANTS --- */
const AVATARS = {
    1: { name: "Newbie", art: "  O  \n /|\\ \n / \\ " },
    3: { name: "Hacker", art: "/\\_/\\\n( o.o )\n =^.^=" },
    5: { name: "Wizard", art: "  /\\ \n /  \\ \n o_o \n/|\\ " },
    8: { name: "Ninja", art: "  ◢◤ \n o_o \n/|\\\n/ \\" }
};

const ROOM_PERSONAS = {
    LOUNGE: "You are an Entertainment Host in a retro terminal. Be casual, fun, and suggest games or music.",
    LIBRARY: "You are a wise Librarian. Provide educational summaries and facts. Be formal but helpful.",
    WORKSHOP: "You are a Senior Engineer. Help with coding, debugging, and system architecture. Use technical terms.",
    STUDIO: "You are a Digital Artist. Be creative and visual. Describe concepts vividly.",
    THINKTANK: "You are a Strategic Analyst. Be logical, concise, and problem-solving oriented."
};

/* --- STATE MANAGEMENT --- */
class TermApp {
    constructor() {
        this.state = {
            xp: parseInt(localStorage.getItem('termos_xp')) || 0,
            level: parseInt(localStorage.getItem('termos_lvl')) || 1,
            currentRoom: 'LOUNGE',
            currentAvatar: parseInt(localStorage.getItem('termos_av')) || 1,
            apiKey: localStorage.getItem('termos_key') || '',
            proxyUrl: localStorage.getItem('termos_proxy') || 'https://corsproxy.io/?',
            conversationHistory: [],
            voiceEnabled: false
        };
        
        this.synth = window.speechSynthesis;
        this.recognition = null;
        
        if (!this.state.apiKey) {
            ui.log("SYSTEM", "No API Key detected. Open Settings to configure.");
        } else {
            document.getElementById('apiKeyInput').value = this.state.apiKey;
        }
        document.getElementById('proxyInput').value = this.state.proxyUrl;
    }

    init() {
        ui.log("SYSTEM", "Booting TermOS LT Kernel...");
        setTimeout(() => ui.log("SYSTEM", "Loading Multiverse Sectors..."), 500);
        setTimeout(() => {
            ui.log("SYSTEM", "Connected.");
            this.speak("System Online");
            ui.updateStats();
        }, 1000);
        
        this.setupVoice();
    }

    /* --- GAMIFICATION --- */
    addXP(amount) {
        this.state.xp += amount;
        localStorage.setItem('termos_xp', this.state.xp);
        
        const nextLevelXp = this.state.level * 10;
        if (this.state.xp >= nextLevelXp) {
            this.state.level++;
            localStorage.setItem('termos_lvl', this.state.level);
            ui.log("SYSTEM", `*** LEVEL UP! LVL ${this.state.level} ***`);
            this.speak(`Level Up achieved. You are now level ${this.state.level}.`);
            this.checkUnlocks();
        }
        ui.updateStats();
    }

    checkUnlocks() {
        if (AVATARS[this.state.level] && this.state.level > this.state.currentAvatar) {
            ui.log("REWARD", `Unlocked Avatar: ${AVATARS[this.state.level].name}`);
        }
    }

    /* --- ROOMS --- */
    switchRoom(roomName) {
        if (this.state.currentRoom === roomName) return;
        
        this.state.currentRoom = roomName;
        this.state.conversationHistory = []; // Clear context for new room
        document.getElementById('roomDisplay').innerText = roomName;
        
        // UI Active State
        document.querySelectorAll('.room-item').forEach(el => el.classList.remove('active'));
        // Find by text content
        Array.from(document.querySelectorAll('.room-item')).find(el => el.innerText.includes(roomName)).classList.add('active');

        ui.log("SYSTEM", `Warping to ${roomName}...`);
        setTimeout(() => {
            ui.log("SYSTEM", `Sector initialized. AI Persona loaded.`);
            this.speak(`Entered ${roomName}`);
        }, 600);
    }

    /* --- AI & NETWORK --- */
    async processCommand(input) {
        const txt = input.trim().toLowerCase();
        if (!txt) return;

        ui.log("YOU", input);
        this.addXP(1); // XP per message

        // 1. Check Local Commands
        if (txt.startsWith('/')) return this.handleSlashCommands(txt);
        
        // 2. Check Agentic Actions (Regex)
        if (txt.includes("play music")) return this.triggerAction("MUSIC");
        if (txt.includes("start game")) return this.triggerAction("GAME");
        
        // 3. API Request
        if (!this.state.apiKey) {
            ui.log("SYSTEM", "Error: API Key missing. Check Config.");
            ui.openSettings();
            return;
        }

        ui.showTyping();
        
        // Prepare Payload
        const systemPrompt = ROOM_PERSONAS[this.state.currentRoom];
        this.state.conversationHistory.push({ role: "user", content: input });

        try {
            const fetchUrl = this.state.proxyUrl + encodeURIComponent('https://api.openai.com/v1/chat/completions');
            
            const response = await fetch(fetchUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.state.apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [
                        { role: "system", content: systemPrompt },
                        ...this.state.conversationHistory
                    ],
                    temperature: 0.7
                })
            });

            const data = await response.json();
            ui.hideTyping();

            if (response.ok) {
                const aiText = data.choices[0].message.content;
                ui.log("TERMAI", aiText);
                this.speak(aiText);
                this.state.conversationHistory.push({ role: "assistant", content: aiText });
            } else {
                throw new Error(data.error?.message || "API Error");
            }

        } catch (err) {
            ui.hideTyping();
            ui.log("SYSTEM", `CONNECTION ERROR: ${err.message}`);
        }
    }

    triggerAction(type) {
        if (type === "MUSIC") ui.openModal('musicModal');
        if (type === "GAME") ui.openModal('gameModal');
    }

    handleSlashCommands(cmd) {
        const parts = cmd.split(' ');
        switch(parts[0]) {
            case '/stats': ui.showStats(this.state); break;
            case '/clear': document.getElementById('chatWindow').innerHTML = ''; break;
            case '/voice': this.toggleVoice(); break;
            case '/config': ui.openSettings(); break;
            default: ui.log("SYSTEM", `Unknown command: ${cmd}`);
        }
    }

    /* --- SETTINGS --- */
    saveConfig() {
        const key = document.getElementById('apiKeyInput').value.trim();
        const proxy = document.getElementById('proxyInput').value.trim();
        
        this.state.apiKey = key;
        this.state.proxyUrl = proxy;
        
        localStorage.setItem('termos_key', key);
        localStorage.setItem('termos_proxy', proxy);
        
        ui.closeModal('settingsModal');
        ui.log("SYSTEM", "Configuration Saved. Rebooting connection...");
        this.state.conversationHistory = [];
    }

    /* --- VOICE --- */
    setupVoice() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.lang = 'en-US';
            this.recognition.onstart = () => { 
                this.state.voiceEnabled = true; 
                document.getElementById('voiceBtn').classList.add('active'); 
            };
            this.recognition.onend = () => { 
                this.state.voiceEnabled = false; 
                document.getElementById('voiceBtn').classList.remove('active'); 
            };
            this.recognition.onresult = (e) => {
                const txt = e.results[0][0].transcript;
                document.getElementById('cmdInput').value = txt;
                this.processCommand(txt);
            };
        }
    }
    
    toggleVoice() {
        if (!this.recognition) return ui.log("SYSTEM", "Voice API not supported.");
        this.state.voiceEnabled ? this.recognition.stop() : this.recognition.start();
    }

    speak(text) {
        if (this.synth) {
            this.synth.cancel(); // Stop previous
            const u = new SpeechSynthesisUtterance(text);
            const voices = this.synth.getVoices();
            // Try to find a robotic or clear voice
            const v = voices.find(x => x.name.includes('Google')) || voices[0];
            if(v) u.voice = v;
            this.synth.speak(u);
        }
    }
}

/* --- UI CONTROLLER --- */
const ui = {
    log: (sender, text) => {
        const win = document.getElementById('chatWindow');
        const msg = document.createElement('div');
        msg.classList.add('message');
        
        if (sender === 'YOU') msg.classList.add('msg-user');
        else if (sender === 'SYSTEM') msg.classList.add('msg-system');
        else msg.classList.add('msg-ai');

        let formatted = text.replace(/\n/g, '<br>');
        // Simple code block fix
        formatted = formatted.replace(/```/g, ''); 
        msg.innerHTML = formatted;
        win.appendChild(msg);
        win.scrollTop = win.scrollHeight;
    },

    showTyping: () => {
        const win = document.getElementById('chatWindow');
        const msg = document.createElement('div');
        msg.id = 'typingIndicator';
        msg.classList.add('message', 'msg-system');
        msg.innerText = "TERMAI is typing...";
        win.appendChild(msg);
        win.scrollTop = win.scrollHeight;
    },

    hideTyping: () => {
        const el = document.getElementById('typingIndicator');
        if(el) el.remove();
    },

    updateStats: () => {
        document.getElementById('levelDisplay').innerText = `LVL: ${app.state.level}`;
        const nextLvlXp = app.state.level * 10;
        const currentLvlBase = (app.state.level - 1) * 10;
        const progress = ((app.state.xp - currentLvlBase) / (nextLvlXp - currentLvlBase)) * 100;
        document.getElementById('xpFill').style.width = `${Math.min(100, Math.max(0, progress))}%`;
    },

    openModal: (id) => {
        document.getElementById(id).classList.add('active');
        if(id === 'gameModal') ui.initGame();
    },
    closeModal: (id) => document.getElementById(id).classList.remove('active'),
    openSettings: () => ui.openModal('settingsModal'),

    showStats: (state) => {
        const currentAv = AVATARS[state.currentAvatar] || AVATARS[1];
        document.getElementById('currentAvatarDisplay').innerText = currentAv.art;
        document.getElementById('profileText').innerHTML = 
            `<strong>Rank:</strong> ${currentAv.name}<br><strong>XP:</strong> ${state.xp}`;
        
        const list = document.getElementById('avatarList');
        list.innerHTML = '';
        Object.keys(AVATARS).forEach(lvl => {
            const data = AVATARS[lvl];
            const isUnlocked = state.level >= lvl;
            const div = document.createElement('div');
            div.className = isUnlocked ? 'unlocked' : 'locked';
            div.innerHTML = `<span style="font-size:10px">${data.art}</span><br>Lvl ${lvl}: ${data.name}`;
            if(isUnlocked) {
                div.onclick = () => {
                    state.currentAvatar = lvl;
                    localStorage.setItem('termos_av', lvl);
                    ui.showStats(state);
                };
            }
            list.appendChild(div);
        });
        ui.openModal('statsModal');
    },

    initGame: () => {
        const container = document.getElementById('miniGame');
        if(container.children.length > 0) return;
        let progress = 0;
        for(let i=0; i<9; i++) {
            const btn = document.createElement('button');
            btn.style.width='50px'; btn.style.height='50px';
            btn.innerText='[ ]';
            btn.onclick = () => {
                btn.innerText='[X]'; btn.style.background='var(--term-dim)';
                progress += 11;
                document.getElementById('hackProgress').innerText = progress;
                if(progress >= 100) {
                    setTimeout(() => {
                        app.addXP(30);
                        ui.closeModal('gameModal');
                        ui.log("SYSTEM", "Hack Complete. +30 XP");
                    }, 500);
                }
            };
            container.appendChild(btn);
        }
    }
};

/* --- INITIALIZATION --- */
const app = new TermApp();

window.onload = () => app.init();

document.getElementById('sendBtn').addEventListener('click', () => {
    const input = document.getElementById('cmdInput');
    app.processCommand(input.value);
    input.value = '';
});
document.getElementById('cmdInput').addEventListener('keypress', (e) => {
    if(e.key === 'Enter') document.getElementById('sendBtn').click();
});
document.getElementById('voiceBtn').addEventListener('click', () => app.toggleVoice());
