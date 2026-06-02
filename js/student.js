class StudentDashboard {
    constructor() {
        this.firebaseManager = window.firebaseManager || new FirebaseManager();
        this.teacherNameDisplay = document.getElementById('teacherNameDisplay');
        
        this.goalsContainer = document.getElementById('studentGoalsContainer');
        this.goalsHeaderTitle = document.getElementById('studentGoalsHeaderTitle');
        this.homeworkDate = document.getElementById('studentHomeworkDate');
        this.homeworkText = document.getElementById('studentHomeworkText');
        this.linksContainer = document.getElementById('studentLinksContainer');
        this.assignedSongsContainer = document.getElementById('assignedSongsContainer');
        this.lessonsContainer = document.getElementById('studentLessonsContainer');
        this.setlistsPanel = document.getElementById('studentSetlistsPanel');
        this.setlistsContainer = document.getElementById('studentSetlistsContainer');

        this.init();
    }

    async init() {
        try {
            await this.firebaseManager.initialize();
            
            this.firebaseManager.auth.onAuthStateChanged(user => {
                if (user) {
                    this.loadDashboard(user);
                } else {
                    window.location.href = 'index.html';
                }
            });
        } catch (error) {
            console.error('Initialization error:', error);
            alert('Failed to initialize application.');
        }
    }

    async loadDashboard(user) {
        try {
            // Check student's profile to find their connected teacher
            const userSnapshot = await this.firebaseManager.database.ref(`users/${user.uid}`).once('value');
            const userData = userSnapshot.val();

            if (!userData || !userData.connectedTeacher) {
                alert("You are not connected to a teacher.");
                window.location.href = 'songlist.html';
                return;
            }

            const teacherUid = userData.connectedTeacher;

            // Fetch Teacher Name & Public Email
            const teacherSnapshot = await this.firebaseManager.database.ref(`users/${teacherUid}`).once('value');
            const teacherData = teacherSnapshot.val() || {};
            if (teacherData.email) {
                this.teacherNameDisplay.textContent = teacherData.email.split('@')[0];
            } else {
                this.teacherNameDisplay.textContent = 'Your Teacher';
            }

            const emailWrapper = document.getElementById('teacherEmailWrapper');
            const emailLink = document.getElementById('teacherEmailLink');
            if (emailWrapper && emailLink) {
                const publicEmail = teacherData.publicEmail || teacherData.email;
                if (publicEmail) {
                    emailLink.textContent = publicEmail;
                    emailLink.href = `mailto:${publicEmail}`;
                    emailWrapper.style.display = 'flex';
                } else {
                    emailWrapper.style.display = 'none';
                }
            }

            // Load and listen to messages
            const chatHistory = document.getElementById('studentChatHistory');
            const messageInput = document.getElementById('studentMessageInput');
            const sendBtn = document.getElementById('studentSendMessageBtn');

            if (chatHistory && messageInput && sendBtn) {
                // Setup listener on messages node
                this.firebaseManager.database.ref(`studentMessages/${teacherUid}/${user.uid}`).on('value', (msgsSnapshot) => {
                    const messages = msgsSnapshot.val() || {};
                    chatHistory.innerHTML = '';
                    
                    const messageKeys = Object.keys(messages);
                    if (messageKeys.length === 0) {
                        chatHistory.innerHTML = '<div style="color: #64748b; font-size: 13px; text-align: center; margin-top: 80px;">No messages yet. Ask a question below!</div>';
                        return;
                    }
                    
                    messageKeys.sort((a, b) => (messages[a].timestamp || 0) - (messages[b].timestamp || 0));
                    
                    messageKeys.forEach(msgId => {
                        const msg = messages[msgId];
                        const msgDiv = document.createElement('div');
                        
                        const isStudent = msg.sender === 'student';
                        msgDiv.style.cssText = `
                            max-width: 80%;
                            padding: 8px 12px;
                            border-radius: 12px;
                            font-size: 0.85rem;
                            line-height: 1.4;
                            word-break: break-word;
                            align-self: ${isStudent ? 'flex-end' : 'flex-start'};
                            background: ${isStudent ? '#6d28d9' : '#e2e8f0'};
                            color: ${isStudent ? '#ffffff' : '#1e293b'};
                        `;
                        
                        const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
                        msgDiv.innerHTML = `
                            <div>${msg.text}</div>
                            <div style="font-size: 10px; opacity: 0.7; text-align: right; margin-top: 4px;">${timeStr}</div>
                        `;
                        chatHistory.appendChild(msgDiv);
                    });
                    
                    // Scroll to bottom
                    chatHistory.scrollTop = chatHistory.scrollHeight;
                });

                const statusDiv = document.getElementById('studentMessageStatus');
                const showStatus = (text, type) => {
                    if (!statusDiv) return;
                    statusDiv.textContent = text;
                    statusDiv.style.display = 'block';
                    if (type === 'error') {
                        statusDiv.style.background = '#fef2f2';
                        statusDiv.style.borderColor = '#fca5a5';
                        statusDiv.style.color = '#b91c1c';
                    } else {
                        statusDiv.style.background = '#f0fdf4';
                        statusDiv.style.borderColor = '#bbf7d0';
                        statusDiv.style.color = '#15803d';
                    }
                    setTimeout(() => {
                        statusDiv.style.display = 'none';
                    }, 4000);
                };

                // Send button handler
                sendBtn.addEventListener('click', async () => {
                    const text = messageInput.value.trim();
                    if (!text) return;
                    
                    sendBtn.disabled = true;
                    try {
                        await this.firebaseManager.database.ref(`studentMessages/${teacherUid}/${user.uid}`).push({
                            text: text,
                            timestamp: firebase.database.ServerValue.TIMESTAMP,
                            sender: 'student',
                            readByTeacher: false
                        });
                        messageInput.value = '';
                        showStatus('Message sent successfully!', 'success');
                    } catch (err) {
                        console.error('Error sending message:', err);
                        showStatus('Could not send message. Database write permission denied. Ask your teacher to set up Realtime Database security rules.', 'error');
                    } finally {
                        sendBtn.disabled = false;
                    }
                });
            }

            // Fetch Student Progress
            const progressRef = this.firebaseManager.database.ref(`studentProgress/${teacherUid}/${user.uid}`);
            
            progressRef.on('value', (snapshot) => {
                const progress = snapshot.val() || {};
                this.renderDashboard(progress);
            });

        } catch (error) {
            console.error('Error loading dashboard:', error);
            alert('Error loading dashboard. Check console.');
        }
    }

    renderDashboard(progress) {
        // Render Booked Lessons
        if (this.lessonsContainer) {
            const lessons = progress.lessons ? Object.values(progress.lessons) : [];
            this.lessonsContainer.innerHTML = '';
            
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            
            const upcomingLessons = lessons.filter(l => l.date >= todayStr);
            
            if (upcomingLessons.length > 0) {
                upcomingLessons.sort((a, b) => {
                    const dateCompare = a.date.localeCompare(b.date);
                    if (dateCompare !== 0) return dateCompare;
                    return a.time.localeCompare(b.time);
                });
                
                upcomingLessons.forEach(lesson => {
                    const row = document.createElement('div');
                    row.className = 'assigned-song-link';
                    row.style.cssText = `
                        border-color: #bbf7d0;
                        background: #f0fdf4;
                        margin-bottom: 8px;
                        cursor: default;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    `;
                    
                    let dateFormatted = lesson.date;
                    try {
                        const d = new Date(lesson.date + 'T00:00:00');
                        dateFormatted = d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
                    } catch (e) {}
                    
                    const recurrenceLabels = {
                        'none': '',
                        'weekly': 'Weekly',
                        '2weekly': 'Every 2 Weeks',
                        'monthly': 'Monthly'
                    };
                    const recText = (lesson.recurrence && lesson.recurrence !== 'none') ? ` (${recurrenceLabels[lesson.recurrence] || lesson.recurrence})` : '';
                    
                    row.innerHTML = `
                        <div style="display: flex; flex-direction: column;">
                            <span style="font-weight: bold; color: #166534; font-size: 14px;">⏰ ${lesson.time}</span>
                            <span style="font-size: 12px; color: #475569; margin-top: 2px;">📅 ${dateFormatted}${recText}</span>
                        </div>
                    `;
                    
                    this.lessonsContainer.appendChild(row);
                });
            } else {
                this.lessonsContainer.innerHTML = '<div style="color: #64748b; font-size: 14px;">No upcoming lessons scheduled.</div>';
            }
        }

        // Render Homework
        if (progress.homework && progress.homework.text) {
            this.homeworkDate.textContent = progress.homework.date ? `Due: ${progress.homework.date}` : '';
            this.homeworkText.textContent = progress.homework.text;
        } else {
            this.homeworkDate.textContent = '';
            this.homeworkText.textContent = 'No homework assigned.';
        }

        // Render Links
        if (progress.links && progress.links.length > 0) {
            this.linksContainer.innerHTML = '';
            progress.links.forEach(link => {
                const a = document.createElement('a');
                a.href = link.url;
                a.target = '_blank';
                a.className = 'assigned-song-link';
                a.style.borderColor = '#e9d5ff';
                a.innerHTML = `<span style="display:flex; align-items:center; gap:8px;">🔗 ${link.title || link.url}</span><span style="color:#a78bfa; font-size:12px;">↗</span>`;
                this.linksContainer.appendChild(a);
            });
        } else {
            this.linksContainer.innerHTML = '<div style="color: #64748b; font-size: 14px;">No links added.</div>';
        }

        // Render Goals
        if (progress.goals && progress.goals.length > 0) {
            this.goalsContainer.innerHTML = '';
            
            const completedCount = progress.goals.filter(g => g.completed).length;
            const level = Math.min(10, Math.floor(completedCount / 5) + 1);
            let badge = '🌱';
            if (level === 10) badge = '💎';
            else if (level >= 8) badge = '🥇';
            else if (level >= 5) badge = '🥈';
            else if (level >= 2) badge = '🥉';

            this.goalsHeaderTitle.innerHTML = `🎯 My Goals <span style="font-size:0.8rem; background:white; padding:2px 8px; border-radius:12px; margin-left:8px; color:#15803d; border:1px solid #bbf7d0;">Level ${level} ${badge} (${completedCount} completed)</span>`;

            progress.goals.forEach(goal => {
                const row = document.createElement('div');
                row.style.cssText = `display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid #bbf7d0; background: ${goal.completed ? '#dcfce7' : '#ffffff'};`;
                row.innerHTML = `
                    <span style="font-size: 16px;">${goal.completed ? '✅' : '⭕'}</span>
                    <span style="font-size: 0.95rem; color: ${goal.completed ? '#16a34a' : '#1e293b'}; flex: 1; font-weight: ${goal.completed ? '600' : '400'};">${goal.text}</span>
                `;
                this.goalsContainer.appendChild(row);
            });
        } else {
            this.goalsContainer.innerHTML = '<div style="color: #64748b; font-size: 14px;">No goals set.</div>';
        }

        // Render Assigned Songs
        if (progress.assignedSongs && Object.keys(progress.assignedSongs).length > 0) {
            this.assignedSongsContainer.innerHTML = '';
            Object.values(progress.assignedSongs).forEach(song => {
                const a = document.createElement('a');
                a.href = `songlist.html?songId=${song.id}`;
                a.className = 'assigned-song-link';
                a.innerHTML = `
                    <div style="display:flex; flex-direction:column;">
                        <span>🎵 ${song.title}</span>
                        ${song.note ? `<span style="font-size:11px; color:#64748b; margin-top:4px; font-weight:normal;">Note: ${song.note}</span>` : ''}
                    </div>
                    <span style="color:#93c5fd; font-size:12px;">Open ↗</span>
                `;
                this.assignedSongsContainer.appendChild(a);
            });
        } else {
            this.assignedSongsContainer.innerHTML = '<div style="color: #64748b; font-size: 14px;">No songs assigned yet.</div>';
        }

        // Render Assigned Setlists
        if (this.setlistsPanel && this.setlistsContainer) {
            const assignedSetlists = progress.assignedSetlists ? Object.values(progress.assignedSetlists) : [];
            this.setlistsContainer.innerHTML = '';
            
            if (assignedSetlists.length > 0) {
                this.setlistsPanel.style.display = 'block';
                assignedSetlists.forEach(setlist => {
                    const setlistGroup = document.createElement('div');
                    setlistGroup.style.cssText = 'background: #ffffff; border: 1px solid #e9d5ff; border-radius: 12px; padding: 12px 15px; display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;';
                    
                    const header = document.createElement('div');
                    header.style.cssText = 'font-weight: bold; color: #6b21a8; font-size: 0.95rem; border-bottom: 1px solid #f3e8ff; padding-bottom: 6px; display: flex; justify-content: space-between; align-items: center;';
                    
                    let dateStr = '';
                    if (setlist.assignedAt) {
                        try {
                            dateStr = new Date(setlist.assignedAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
                        } catch (e) {}
                    }
                    header.innerHTML = `
                        <span>📋 ${setlist.name}</span>
                        ${dateStr ? `<span style="font-size: 11px; font-weight: normal; color: #a78bfa;">Assigned ${dateStr}</span>` : ''}
                    `;
                    setlistGroup.appendChild(header);
                    
                    const songs = setlist.songs ? Object.values(setlist.songs) : [];
                    if (songs.length === 0) {
                        const noSongs = document.createElement('div');
                        noSongs.style.cssText = 'color: #64748b; font-size: 12px; padding: 4px 0;';
                        noSongs.textContent = 'No songs in this setlist.';
                        setlistGroup.appendChild(noSongs);
                    } else {
                        songs.forEach(song => {
                            const a = document.createElement('a');
                            a.href = `songlist.html?songId=${song.id}`;
                            a.className = 'assigned-song-link';
                            a.style.cssText = 'margin-bottom: 0; background: #faf5ff; border-color: #f3e8ff; padding: 10px 12px;';
                            a.innerHTML = `
                                <span>🎵 ${song.title}</span>
                                <span style="color:#c084fc; font-size:12px;">Open ↗</span>
                            `;
                            setlistGroup.appendChild(a);
                        });
                    }
                    
                    this.setlistsContainer.appendChild(setlistGroup);
                });
            } else {
                this.setlistsPanel.style.display = 'none';
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.studentDashboard = new StudentDashboard();
});
