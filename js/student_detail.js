// Student Progress Detail / Editor for Teachers
class StudentDetailEditor {
    constructor() {
        this.firebaseManager = new FirebaseManager();
        this.studentEmailDisplay = document.getElementById('studentEmailDisplay');
        this.studentSubtitle = document.getElementById('studentSubtitle');
        this.assignedSongsContainer = document.getElementById('spAssignedSongsContainer');
        this.homeworkDate = document.getElementById('spHomeworkDate');
        this.homeworkText = document.getElementById('spHomeworkText');
        this.homeworkListContainer = document.getElementById('spHomeworkListContainer');
        this.addHomeworkBtn = document.getElementById('spAddHomeworkBtn');
        this.linksContainer = document.getElementById('spLinksContainer');
        this.goalsContainer = document.getElementById('spGoalsContainer');
        this.goalsHeaderTitle = document.getElementById('spGoalsHeaderTitle');
        this.loadGoalsSetSelect = document.getElementById('spLoadGoalsSetSelect');
        this.assignedSetlistsContainer = document.getElementById('spAssignedSetlistsContainer');
        this.assignSetlistSelect = document.getElementById('spAssignSetlistSelect');
        this.assignSetlistBtn = document.getElementById('spAssignSetlistBtn');

        // Form fields
        this.assignSongSelect = document.getElementById('spAssignSongSelect');
        this.assignSongBtn = document.getElementById('spAssignSongBtn');
        this.assignSongNote = document.getElementById('spAssignSongNote');
        this.newLinkTitle = document.getElementById('spNewLinkTitle');
        this.newLinkUrl = document.getElementById('spNewLinkUrl');
        this.addLinkBtn = document.getElementById('spAddLinkBtn');
        this.newGoalText = document.getElementById('spNewGoalText');
        this.addGoalBtn = document.getElementById('spAddGoalBtn');
        this.saveBtn = document.getElementById('spSaveBtn');
        this.saveStatusText = document.getElementById('saveStatusText');
        this.removeStudentBtn = document.getElementById('removeStudentBtn');

        this.studentUid = null;
        this.studentEmail = null;
        this._currentProgress = null;
        this._initialProgress = null;

        this.init();
    }

    async init() {
        await this.firebaseManager.initialize();

        // Get studentUid from URL
        const params = new URLSearchParams(window.location.search);
        this.studentUid = params.get('studentId');

        if (!this.studentUid) {
            alert('No student selected. Redirecting back to Teacher Dashboard.');
            window.location.href = 'teacher.html';
            return;
        }

        // Wait for auth
        await new Promise(resolve => {
            const unsubscribe = firebase.auth().onAuthStateChanged(async user => {
                if (user) {
                    // Check if current user is indeed a teacher
                    const userSnap = await this.firebaseManager.database.ref(`users/${user.uid}`).once('value');
                    const userData = userSnap.val();
                    if (!userData || userData.role !== 'teacher') {
                        alert('Access Denied. You must be a teacher to access this page.');
                        window.location.href = 'songlist.html';
                        return;
                    }
                    this.loadStudentAndProgress(user);
                } else {
                    window.location.href = 'index.html';
                }
                unsubscribe();
                resolve();
            });
        });

        this.setupEventListeners();
    }

    async loadStudentAndProgress(teacherUser) {
        try {
            // Load Student Email
            const studentSnap = await this.firebaseManager.database.ref(`users/${this.studentUid}`).once('value');
            const studentData = studentSnap.val();
            if (studentData) {
                this.studentEmail = studentData.email || '';
                this.studentInstrument = (studentData.preferences && studentData.preferences.instrument) || 'guitar';
                const emailPrefix = this.studentEmail.split('@')[0];
                const capitalizedPrefix = emailPrefix ? emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1) : 'Student';
                const displayName = studentData.name || studentData.displayName || capitalizedPrefix;
                
                this.studentEmailDisplay.textContent = displayName;
                this.studentSubtitle.textContent = `Managing ${this.studentEmail}`;
            }

            // Load Teacher's Songs & Public Songs for Dropdown
            const [songsSnapshot, publicSnapshot] = await Promise.all([
                this.firebaseManager.database.ref(`users/${teacherUser.uid}/songs`).once('value'),
                this.firebaseManager.database.ref('publicSongs').once('value')
            ]);
            const songsData = songsSnapshot.val() || {};
            const publicData = publicSnapshot.val() || {};
            this.assignSongSelect.innerHTML = '<option value="">-- Select a Song --</option>';

            const addedSongIds = new Set();

            // 1. Add Default Songs (from DEFAULT_SONGS)
            if (typeof DEFAULT_SONGS !== 'undefined' && Array.isArray(DEFAULT_SONGS)) {
                // Sort them alphabetically by title
                const sortedDefaults = [...DEFAULT_SONGS].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
                sortedDefaults.forEach(song => {
                    if (song && song.id && song.title) {
                        const opt = document.createElement('option');
                        opt.value = song.id;
                        opt.textContent = `${song.title} - ${song.artist || 'Unknown'}`;
                        this.assignSongSelect.appendChild(opt);
                        addedSongIds.add(String(song.id));
                    }
                });
            }

            // 2. Add Teacher's Custom Songs
            const songsArray = Array.isArray(songsData) ? songsData : Object.values(songsData);
            songsArray.forEach(song => {
                if (song && song.id && song.title) {
                    if (!addedSongIds.has(String(song.id))) {
                        const opt = document.createElement('option');
                        opt.value = song.id;
                        opt.textContent = `[Custom] ${song.title} - ${song.artist || 'Unknown'}`;
                        this.assignSongSelect.appendChild(opt);
                        addedSongIds.add(String(song.id));
                    }
                }
            });

            // 3. Add Public Songs
            const publicArray = Array.isArray(publicData) ? publicData : Object.values(publicData);
            publicArray.forEach(song => {
                if (song && song.id && song.title) {
                    if (!addedSongIds.has(String(song.id))) {
                        const opt = document.createElement('option');
                        opt.value = song.id;
                        opt.textContent = `[Public] ${song.title} - ${song.artist || 'Unknown'}`;
                        this.assignSongSelect.appendChild(opt);
                        addedSongIds.add(String(song.id));
                    }
                }
            });

            // Load Teacher's Goals Settings (Default Goals + Custom Sets)
            const settingsSnap = await this.firebaseManager.database.ref(`studentProgress/${teacherUser.uid}/settings`).once('value');
            const settings = settingsSnap.val() || {};
            this.teacherDefaultGoals = settings.defaultGoals || null;
            this.teacherDefaultGoalsGuitar = settings.defaultGoals_guitar || null;
            this.teacherDefaultGoalsPiano = settings.defaultGoals_piano || null;
            this.teacherCustomGoalSets = settings.customGoalSets || {};

            if (this.loadGoalsSetSelect) {
                this.loadGoalsSetSelect.innerHTML = '<option value="">-- Load Goal Set --</option>';
                const optDefault = document.createElement('option');
                optDefault.value = 'default';
                optDefault.textContent = 'Default Goals (for new students)';
                this.loadGoalsSetSelect.appendChild(optDefault);
                
                Object.keys(this.teacherCustomGoalSets).forEach(setId => {
                    const set = this.teacherCustomGoalSets[setId];
                    if (set && set.name) {
                        const opt = document.createElement('option');
                        opt.value = `custom_${setId}`;
                        opt.textContent = `[Custom] ${set.name}`;
                        this.loadGoalsSetSelect.appendChild(opt);
                    }
                });
            }

            // Load Teacher's Setlists for Dropdown
            try {
                const setlistsSnapshot = await this.firebaseManager.database.ref(`studentProgress/${teacherUser.uid}/setlists`).once('value');
                this.teacherSetlists = setlistsSnapshot.val() || {};
                
                if (this.assignSetlistSelect) {
                    this.assignSetlistSelect.innerHTML = '<option value="">-- Select a Setlist --</option>';
                    Object.keys(this.teacherSetlists).forEach(setlistId => {
                        const setlist = this.teacherSetlists[setlistId];
                        if (setlist && setlist.name) {
                            const opt = document.createElement('option');
                            opt.value = setlistId;
                            opt.textContent = setlist.name;
                            this.assignSetlistSelect.appendChild(opt);
                        }
                    });
                }
            } catch (err) {
                console.error("Failed to load setlists for dropdown:", err);
            }

            // Load Student's Progress
            const result = await this.firebaseManager.getStudentProgress(this.studentUid);
            if (!result.success) {
                alert('Failed to load progress: ' + result.error);
                return;
            }

            this._currentProgress = result.progress || {};
            
            // Initialize/migrate homeworks list
            if (!this._currentProgress.homeworks) {
                this._currentProgress.homeworks = [];
                if (this._currentProgress.homework && this._currentProgress.homework.text) {
                    this._currentProgress.homeworks.push({
                        id: 'hw_' + Date.now(),
                        text: this._currentProgress.homework.text,
                        date: this._currentProgress.homework.date || '',
                        completed: false,
                        created: Date.now()
                    });
                }
            }
            if (!this._currentProgress.homework) {
                this._currentProgress.homework = { text: '', date: '' };
            }
            if (!this._currentProgress.goals) this._currentProgress.goals = [];
            if (!this._currentProgress.links) this._currentProgress.links = [];
            if (!this._currentProgress.assignedSongs) this._currentProgress.assignedSongs = {};
            if (!this._currentProgress.assignedSetlists) this._currentProgress.assignedSetlists = {};
 
            // Populate Homework Inputs (start empty for new assignments)
            this.homeworkDate.value = '';
            this.homeworkText.value = '';
 
            // Render Lists
            this._renderGoals();
            this._renderLinks();
            this._renderAssignedSongs();
            this._renderAssignedSetlists();
            this._renderHomeworks();

            // Store a deep clone AFTER rendering so checkDirtyState has the correct baseline
            // (rendering may trigger checkDirtyState, which needs _initialProgress to be set)
            this._initialProgress = JSON.parse(JSON.stringify(this._currentProgress));

            // Now run a final dirty check so the save button starts hidden
            this.checkDirtyState();

            // Listen to student messages in real-time
            const spChatHistory = document.getElementById('spChatHistory');
            const spMessageInput = document.getElementById('spMessageInput');
            const spSendMessageBtn = document.getElementById('spSendMessageBtn');
            const teacherUid = teacherUser.uid;
            
            if (spChatHistory && spMessageInput && spSendMessageBtn) {
                this.firebaseManager.database.ref(`studentMessages/${teacherUid}/${this.studentUid}`).on('value', (msgsSnapshot) => {
                    const messages = msgsSnapshot.val() || {};
                    spChatHistory.innerHTML = '';
                    
                    const messageKeys = Object.keys(messages);
                    if (messageKeys.length === 0) {
                        spChatHistory.innerHTML = '<div style="color: #64748b; font-size: 13px; text-align: center; margin-top: 100px;">No messages yet.</div>';
                        return;
                    }
                    
                    // Sort by timestamp
                    messageKeys.sort((a, b) => (messages[a].timestamp || 0) - (messages[b].timestamp || 0));
                    
                    let updates = {};
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
                            align-self: ${isStudent ? 'flex-start' : 'flex-end'};
                            background: ${isStudent ? '#e2e8f0' : '#6d28d9'};
                            color: ${isStudent ? '#1e293b' : '#ffffff'};
                        `;
                        
                        const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
                        msgDiv.innerHTML = `
                            <div>${msg.text}</div>
                            <div style="font-size: 10px; opacity: 0.7; text-align: right; margin-top: 4px;">${timeStr}</div>
                        `;
                        spChatHistory.appendChild(msgDiv);
                        
                        // Mark as read automatically if sent by student and unread
                        if (isStudent && msg.readByTeacher === false) {
                            updates[`studentMessages/${teacherUid}/${this.studentUid}/${msgId}/readByTeacher`] = true;
                        }
                    });
                    
                    // Apply read status updates to firebase
                    if (Object.keys(updates).length > 0) {
                        this.firebaseManager.database.ref().update(updates).catch(err => {
                            console.error("Failed to mark messages as read:", err);
                        });
                    }
                    
                    // Scroll to bottom
                    spChatHistory.scrollTop = spChatHistory.scrollHeight;
                });
                
                const statusDiv = document.getElementById('spMessageStatus');
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

                // Click handler for sending replies
                spSendMessageBtn.addEventListener('click', async () => {
                    const text = spMessageInput.value.trim();
                    if (!text) return;
                    
                    spSendMessageBtn.disabled = true;
                    try {
                        await this.firebaseManager.database.ref(`studentMessages/${teacherUid}/${this.studentUid}`).push({
                            text: text,
                            timestamp: firebase.database.ServerValue.TIMESTAMP,
                            sender: 'teacher',
                            readByTeacher: true
                        });
                        spMessageInput.value = '';
                        showStatus('Reply sent successfully!', 'success');
                    } catch (err) {
                        console.error('Failed to send reply:', err);
                        showStatus('Could not send reply. Database write permission denied.', 'error');
                    } finally {
                        spSendMessageBtn.disabled = false;
                    }
                });
            }

        } catch (e) {
            console.error('Error loading student detail editor', e);
            alert('Failed to load dashboard.');
        }
    }

    setupEventListeners() {
        // Add Homework
        if (this.addHomeworkBtn) {
            this.addHomeworkBtn.addEventListener('click', () => {
                const text = this.homeworkText.value.trim();
                const date = this.homeworkDate.value;
                if (!text) { alert('Please enter homework instructions.'); return; }
                
                if (!this._currentProgress.homeworks) {
                    this._currentProgress.homeworks = [];
                }
                
                const newHomework = {
                    id: 'hw_' + Date.now(),
                    text: text,
                    date: date || '',
                    completed: false,
                    created: Date.now()
                };
                
                this._currentProgress.homeworks.unshift(newHomework);
                this.homeworkText.value = '';
                this.homeworkDate.value = '';
                
                this._syncLegacyHomework();
                this._renderHomeworks();
            });
        }

        // Add Goal
        if (this.addGoalBtn) {
            this.addGoalBtn.addEventListener('click', () => {
                const goalText = this.newGoalText.value.trim();
                if (!goalText) { alert('Please enter a goal description.'); return; }
                const newGoal = {
                    id: 'goal_' + Date.now(),
                    text: goalText,
                    completed: false
                };
                this._currentProgress.goals.push(newGoal);
                this.newGoalText.value = '';
                this._renderGoals();
            });
            this.newGoalText.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.addGoalBtn.click();
            });
        }

        // Add Link
        if (this.addLinkBtn) {
            this.addLinkBtn.addEventListener('click', () => {
                const title = this.newLinkTitle.value.trim();
                const url = this.newLinkUrl.value.trim();
                if (!url) { alert('Please enter a URL.'); return; }
                this._currentProgress.links.push({ title: title || url, url });
                this.newLinkTitle.value = '';
                this.newLinkUrl.value = '';
                this._renderLinks();
            });
            this.newLinkUrl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.addLinkBtn.click();
            });
        }

        // Assign Song
        if (this.assignSongBtn) {
            this.assignSongBtn.addEventListener('click', () => {
                const songId = this.assignSongSelect.value;
                if (!songId) { alert('Please select a song to assign.'); return; }

                const songTitle = this.assignSongSelect.options[this.assignSongSelect.selectedIndex].text;
                const note = this.assignSongNote.value.trim();

                this._currentProgress.assignedSongs[songId] = {
                    id: songId,
                    title: songTitle,
                    note: note,
                    assignedAt: Date.now()
                };

                this.assignSongNote.value = '';
                this.assignSongSelect.value = '';
                this._renderAssignedSongs();
            });
        }

        // Assign Setlist
        if (this.assignSetlistBtn) {
            this.assignSetlistBtn.addEventListener('click', () => {
                const setlistId = this.assignSetlistSelect.value;
                if (!setlistId) { alert('Please select a setlist to assign.'); return; }

                const setlist = this.teacherSetlists[setlistId];
                if (!setlist) return;

                this._currentProgress.assignedSetlists[setlistId] = {
                    id: setlistId,
                    name: setlist.name,
                    songs: setlist.songs || {},
                    assignedAt: Date.now()
                };

                // Also copy songs to assignedSongs for backward compatibility
                if (setlist.songs) {
                    const songsArray = Array.isArray(setlist.songs) ? setlist.songs : Object.values(setlist.songs);
                    songsArray.forEach(song => {
                        if (song && song.id) {
                            this._currentProgress.assignedSongs[song.id] = {
                                id: song.id,
                                title: song.title,
                                note: `From setlist: ${setlist.name}`,
                                assignedAt: Date.now()
                            };
                        }
                    });
                }

                this.assignSetlistSelect.value = '';
                this._renderAssignedSetlists();
                this._renderAssignedSongs();
            });
        }

        // Load Goals Set Dropdown Change
        if (this.loadGoalsSetSelect) {
            const systemDefaultGoalsGuitar = [
                { id: 'goal_0', text: 'Tuning the guitar', completed: false },
                { id: 'goal_1', text: 'C Em G and D chord', completed: false },
                { id: 'goal_2', text: 'Am E Dm chords', completed: false },
                { id: 'goal_3', text: 'F and Bm small barre chord', completed: false },
                { id: 'goal_4', text: 'F and Bb chord', completed: false },
                { id: 'goal_5', text: 'Pentatonic Scale', completed: false },
                { id: 'goal_6', text: 'Play Harry Styles - Sign of the Times from start to finish', completed: false },
                { id: 'goal_7', text: "Play Bill Withers - Ain't No Sunshine from start to finish", completed: false },
                { id: 'goal_8', text: 'Play Taylor Swift - All Too Well from start to finish', completed: false },
                { id: 'goal_9', text: 'Play The Cranberries - Zombie from start to finish', completed: false },
                { id: 'goal_10', text: "Play Madcon - Don't Worry from start to finish", completed: false },
                { id: 'goal_11', text: 'C major scale', completed: false },
                { id: 'goal_12', text: 'A minor scale', completed: false },
                { id: 'goal_13', text: 'Sus2 and sus4 chords', completed: false },
                { id: 'goal_14', text: 'Seventh chords', completed: false },
                { id: 'goal_15', text: 'Naming all notes on the E and A bass strings', completed: false },
                { id: 'goal_16', text: 'Naming all notes on D and G string', completed: false },
                { id: 'goal_17', text: 'Fingerpicking 3 patterns', completed: false },
                { id: 'goal_18', text: 'Power Chords', completed: false },
                { id: 'goal_19', text: 'Blues improvisation in A', completed: false },
                { id: 'goal_20', text: 'Slide, Bends', completed: false },
                { id: 'goal_21', text: 'Tapping', completed: false },
                { id: 'goal_22', text: 'Naming all notes on all strings', completed: false },
                { id: 'goal_23', text: 'Play 6 chords in a key ( I ii iii IV V vi )', completed: false }
            ];

            const systemDefaultGoalsPiano = [
                { id: 'goal_0', text: 'Proper sitting posture and hand shape', completed: false },
                { id: 'goal_1', text: 'C, Em, G, and D chords (Root position)', completed: false },
                { id: 'goal_2', text: 'Am, E, and Dm chords (Root position)', completed: false },
                { id: 'goal_3', text: 'F and Bm chords (Root position)', completed: false },
                { id: 'goal_4', text: 'F and Bb chords (Root position)', completed: false },
                { id: 'goal_5', text: 'Major pentatonic scale (C and G, right hand)', completed: false },
                { id: 'goal_6', text: 'Play Harry Styles - Sign of the Times from start to finish', completed: false },
                { id: 'goal_7', text: "Play Bill Withers - Ain't No Sunshine from start to finish", completed: false },
                { id: 'goal_8', text: 'Play Taylor Swift - All Too Well from start to finish', completed: false },
                { id: 'goal_9', text: 'Play The Cranberries - Zombie from start to finish', completed: false },
                { id: 'goal_10', text: "Play Madcon - Don't Worry from start to finish", completed: false },
                { id: 'goal_11', text: 'C major scale (Two octaves, hands together)', completed: false },
                { id: 'goal_12', text: 'A minor scale (Two octaves, hands together)', completed: false },
                { id: 'goal_13', text: 'Sus2 and sus4 chords', completed: false },
                { id: 'goal_14', text: 'Seventh chords (Major 7, Minor 7, Dominant 7)', completed: false },
                { id: 'goal_15', text: 'Identify all white and black keys instantly', completed: false },
                { id: 'goal_16', text: 'Play root notes in Left Hand while playing chords in Right Hand', completed: false },
                { id: 'goal_17', text: 'Arpeggio pattern (1-5-8 pattern in Left Hand)', completed: false },
                { id: 'goal_18', text: 'Chord inversions (1st and 2nd inversions for C, F, G)', completed: false },
                { id: 'goal_19', text: 'Blues scale and basic improvisation in C', completed: false },
                { id: 'goal_20', text: 'Using the sustain pedal with clean coordination', completed: false },
                { id: 'goal_21', text: 'Basic hand independence (different rhythms in each hand)', completed: false },
                { id: 'goal_22', text: 'Sight-read simple treble and bass clef notes', completed: false },
                { id: 'goal_23', text: 'Play 6 chords in a key ( I ii iii IV V vi )', completed: false },
                { id: 'goal_24', text: 'Transpose a simple 4-chord song to another key', completed: false }
            ];

            this.loadGoalsSetSelect.addEventListener('change', async (e) => {
                const val = e.target.value;
                if (!val) return;
                
                let setName = '';
                let targetGoals = [];
                
                if (val === 'default') {
                    setName = 'Default Goals';
                    
                    const isPiano = (this.studentInstrument === 'piano');
                    if (isPiano) {
                        targetGoals = this.teacherDefaultGoalsPiano || this.teacherDefaultGoals || systemDefaultGoalsPiano;
                    } else {
                        targetGoals = this.teacherDefaultGoalsGuitar || this.teacherDefaultGoals || systemDefaultGoalsGuitar;
                    }
                } else if (val.startsWith('custom_')) {
                    const setId = val.replace('custom_', '');
                    const set = this.teacherCustomGoalSets[setId];
                    if (set) {
                        setName = set.name;
                        targetGoals = set.goals || [];
                    }
                }
                
                if (!setName || !targetGoals) {
                    this.loadGoalsSetSelect.value = '';
                    return;
                }
                
                const confirmed = await this.showCustomConfirm('Load Goal Set', `Load goals set '${setName}'? This will replace the student's current goals list (existing progress checks for matching text will be preserved).`);
                if (confirmed) {
                    const currentGoalsMap = {};
                    (this._currentProgress.goals || []).forEach(g => {
                        if (g && g.text) {
                            currentGoalsMap[g.text.trim().toLowerCase()] = g.completed;
                        }
                    });
                    
                    const newGoals = targetGoals.map((g, index) => {
                        const trimmedText = (g.text || '').trim();
                        const wasCompleted = currentGoalsMap[trimmedText.toLowerCase()] || false;
                        return {
                            id: `goal_${Date.now()}_${index}`,
                            text: trimmedText,
                            completed: wasCompleted
                        };
                    });
                    
                    this._currentProgress.goals = newGoals;
                    this._renderGoals();
                    this.checkDirtyState();
                }
                
                // Reset select dropdown
                this.loadGoalsSetSelect.value = '';
            });
        }

        // Homework Change Listeners to check for dirty state
        if (this.homeworkText) {
            this.homeworkText.addEventListener('input', () => this.checkDirtyState());
        }
        if (this.homeworkDate) {
            this.homeworkDate.addEventListener('change', () => this.checkDirtyState());
        }

        // Save Progress
        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', async () => {
                // If there's pending text in the input, auto-assign it first
                const pendingText = this.homeworkText.value.trim();
                if (pendingText) {
                    if (!this._currentProgress.homeworks) {
                        this._currentProgress.homeworks = [];
                    }
                    const newHomework = {
                        id: 'hw_' + Date.now(),
                        text: pendingText,
                        date: this.homeworkDate.value || '',
                        completed: false,
                        created: Date.now()
                    };
                    this._currentProgress.homeworks.unshift(newHomework);
                    this.homeworkText.value = '';
                    this.homeworkDate.value = '';
                }

                this._syncLegacyHomework();

                this.saveBtn.textContent = 'Saving...';
                this.saveBtn.disabled = true;

                const result = await this.firebaseManager.updateStudentProgress(this.studentUid, this._currentProgress);
                if (result.success) {
                    this.saveBtn.textContent = '✅ Saved!';
                    this.saveBtn.style.background = '#10b981';

                    // Update initial progress state to current progress
                    this._initialProgress = JSON.parse(JSON.stringify(this._currentProgress));

                    if (this.saveStatusText) {
                        this.saveStatusText.textContent = 'All changes saved';
                        this.saveStatusText.style.color = '#16a34a';
                    }

                    this._renderHomeworks();

                    setTimeout(() => {
                        this.saveBtn.innerHTML = '💾 SAVE';
                        this.saveBtn.style.background = '#3b82f6';
                        this.saveBtn.disabled = false;
                        this.checkDirtyState();
                    }, 2000);
                } else {
                    alert('Save failed: ' + result.error);
                    this.saveBtn.innerHTML = '💾 SAVE';
                    this.saveBtn.style.background = '#3b82f6';
                    this.saveBtn.disabled = false;
                }
            });
        }

        // Remove Student Button
        if (this.removeStudentBtn) {
            this.removeStudentBtn.addEventListener('click', () => {
                this.confirmRemoveStudent();
            });
        }
    }

    _renderGoals() {
        const goals = this._currentProgress.goals || [];
        this.goalsContainer.innerHTML = '';

        // Gamification Calculation
        const completedCount = goals.filter(g => g.completed).length;
        const level = Math.min(10, Math.floor(completedCount / 5) + 1);
        let badge = '🌱';
        if (level === 10) badge = '💎';
        else if (level >= 8) badge = '🥇';
        else if (level >= 5) badge = '🥈';
        else if (level >= 2) badge = '🥉';

        if (this.goalsHeaderTitle) {
            this.goalsHeaderTitle.innerHTML = `🎯 Goals <span style="font-size:0.8rem; background:#e0f2fe; padding:2px 8px; border-radius:12px; margin-left:8px; color:#0369a1;">Level ${level} ${badge} (${completedCount}/${goals.length} completed)</span>`;
        }

        if (goals.length === 0) {
            this.goalsContainer.innerHTML = '<p style="color: #64748b; font-size: 0.9rem; padding: 12px;">No goals added yet.</p>';
            this.checkDirtyState();
            return;
        }

        goals.forEach((goal, idx) => {
            const row = document.createElement('div');
            row.style.cssText = `display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; transition: background 0.1s; ${ goal.completed ? 'background: #f0fdf4;' : 'background: transparent;' }`;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = !!goal.completed;
            checkbox.style.cssText = 'width: 18px; height: 18px; cursor: pointer; accent-color: #10b981; margin: 0;';
            checkbox.addEventListener('change', () => {
                this._currentProgress.goals[idx].completed = checkbox.checked;
                row.style.background = checkbox.checked ? '#f0fdf4' : 'transparent';
                this._renderGoals();
            });

            const labelText = document.createElement('span');
            labelText.style.cssText = `font-size: 0.9rem; color: ${ goal.completed ? '#16a34a' : '#1e293b' }; flex: 1; user-select: none; font-weight: ${ goal.completed ? '600' : '400' }; cursor: pointer;`;
            labelText.textContent = goal.text;
            labelText.title = 'Double-click to rename';

            // Double click rename
            labelText.addEventListener('dblclick', () => {
                const input = document.createElement('input');
                input.type = 'text';
                input.value = goal.text;
                input.style.cssText = 'flex: 1; padding: 4px 8px; border: 1px solid #3b82f6; border-radius: 4px; font-size: 0.9rem; font-family: inherit;';
                labelText.replaceWith(input);
                input.focus();
                input.select();
                const finish = () => {
                    const newText = input.value.trim() || goal.text;
                    this._currentProgress.goals[idx].text = newText;
                    labelText.textContent = newText;
                    input.replaceWith(labelText);
                };
                input.addEventListener('blur', finish);
                input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
            });

            // Delete Goal Button
            const delBtn = document.createElement('button');
            delBtn.innerHTML = '&times;';
            delBtn.style.cssText = 'background: none; border: none; cursor: pointer; color: #ef4444; font-size: 20px; line-height: 1; padding: 0 4px; font-weight: bold;';
            delBtn.title = 'Delete Goal';
            delBtn.addEventListener('click', () => {
                this._currentProgress.goals.splice(idx, 1);
                this._renderGoals();
            });

            row.appendChild(checkbox);
            row.appendChild(labelText);
            row.appendChild(delBtn);
            this.goalsContainer.appendChild(row);
        });

        this.checkDirtyState();
    }

    _renderLinks() {
        const links = this._currentProgress.links || [];
        this.linksContainer.innerHTML = '';

        if (links.length === 0) {
            this.linksContainer.innerHTML = '<p style="color: #64748b; font-size: 0.9rem; padding: 4px 0;">No links added yet.</p>';
            this.checkDirtyState();
            return;
        }

        links.forEach((link, idx) => {
            const row = document.createElement('div');
            row.style.cssText = 'display: flex; align-items: center; gap: 10px; background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0;';
            row.innerHTML = `
                <a href="${link.url}" target="_blank" style="flex: 1; color: #3b82f6; font-weight: 600; font-size: 0.9rem; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${link.url}">${link.title || link.url}</a>
                <button class="del-link-btn" style="background: none; border: none; cursor: pointer; color: #ef4444; font-size: 18px; line-height: 1; padding: 0;" title="Remove Link">&times;</button>
            `;
            const delBtn = row.querySelector('.del-link-btn');
            delBtn.addEventListener('click', () => {
                this._currentProgress.links.splice(idx, 1);
                this._renderLinks();
            });
            this.linksContainer.appendChild(row);
        });

        this.checkDirtyState();
    }

    _renderAssignedSongs() {
        const assignedSongs = this._currentProgress.assignedSongs || {};
        this.assignedSongsContainer.innerHTML = '';

        const songIds = Object.keys(assignedSongs);
        if (songIds.length === 0) {
            this.assignedSongsContainer.innerHTML = '<div style="color: #64748b; font-size: 14px;">No songs assigned yet.</div>';
            this.checkDirtyState();
            return;
        }

        songIds.forEach(songId => {
            const song = assignedSongs[songId];
            const card = document.createElement('div');
            card.className = 'assigned-song-item';
            card.innerHTML = `
                <div style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    <div style="font-weight: 600; font-size: 0.95rem; color: #1e293b;">${song.title}</div>
                    ${song.note ? `<div style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">Note: ${song.note}</div>` : ''}
                </div>
                <button class="del-song-btn" style="background: none; border: none; cursor: pointer; color: #ef4444; font-size: 18px; line-height: 1; padding: 0 4px;" title="Unassign Song">&times;</button>
            `;

            const delBtn = card.querySelector('.del-song-btn');
            delBtn.addEventListener('click', () => {
                delete this._currentProgress.assignedSongs[songId];
                this._renderAssignedSongs();
            });

            this.assignedSongsContainer.appendChild(card);
        });

        this.checkDirtyState();
    }

    checkDirtyState() {
        if (!this._initialProgress || !this._currentProgress) return;

        // Check if there is any pending text in the assign box inputs
        const pendingHomeworkText = this.homeworkText ? this.homeworkText.value.trim() : '';

        const isDirty = JSON.stringify(this._initialProgress) !== JSON.stringify(this._currentProgress) ||
                        pendingHomeworkText.length > 0;

        if (isDirty) {
            if (this.saveBtn) this.saveBtn.classList.remove('hidden');
        } else {
            if (this.saveBtn) this.saveBtn.classList.add('hidden');
        }
    }

    showCustomConfirm(title, message, type = 'primary') {
        return new Promise((resolve) => {
            const modal = document.getElementById('customConfirmModal');
            const titleEl = document.getElementById('customConfirmTitle');
            const msgEl = document.getElementById('customConfirmMessage');
            const okBtn = document.getElementById('customConfirmOkBtn');
            const cancelBtn = document.getElementById('customConfirmCancelBtn');
            const iconEl = document.getElementById('customConfirmIcon');
            
            if (!modal || !msgEl || !okBtn || !cancelBtn) {
                resolve(window.confirm(message));
                return;
            }
            
            titleEl.textContent = title || 'Confirm';
            msgEl.textContent = message;
            
            if (type === 'danger') {
                okBtn.style.background = '#ef4444';
                if (iconEl) {
                    iconEl.style.background = '#fee2e2';
                    iconEl.style.color = '#ef4444';
                    iconEl.textContent = '⚠️';
                }
            } else {
                okBtn.style.background = '#3b82f6';
                if (iconEl) {
                    iconEl.style.background = '#e0f2fe';
                    iconEl.style.color = '#0284c7';
                    iconEl.textContent = '❓';
                }
            }
            
            const handleOk = () => {
                cleanup();
                resolve(true);
            };
            
            const handleCancel = () => {
                cleanup();
                resolve(false);
            };
            
            const cleanup = () => {
                okBtn.removeEventListener('click', handleOk);
                cancelBtn.removeEventListener('click', handleCancel);
                modal.classList.add('hidden');
                modal.style.display = 'none';
            };
            
            okBtn.addEventListener('click', handleOk);
            cancelBtn.addEventListener('click', handleCancel);
            
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
        });
    }

    async confirmRemoveStudent() {
        const studentName = this.studentEmailDisplay.textContent || 'this student';
        const confirmed = await this.showCustomConfirm(
            'Remove Student',
            `Are you sure you want to remove ${studentName} from your class? This will disconnect their profile from your teacher account. They will no longer appear on your roster, and you will not see their updates.`,
            'danger'
        );

        if (confirmed) {
            try {
                this.removeStudentBtn.disabled = true;
                this.removeStudentBtn.textContent = '...';
                const result = await this.firebaseManager.removeStudent(this.studentUid);
                if (result.success) {
                    alert('Student removed successfully.');
                    window.location.href = 'teacher_students.html';
                } else {
                    alert('Failed to remove student: ' + result.error);
                    this.removeStudentBtn.disabled = false;
                    this.removeStudentBtn.innerHTML = '&times;';
                }
            } catch (e) {
                console.error('Error removing student:', e);
                alert('Error removing student: ' + e.message);
                this.removeStudentBtn.disabled = false;
                this.removeStudentBtn.innerHTML = '&times;';
            }
        }
    }

    _renderAssignedSetlists() {
        const assignedSetlists = this._currentProgress.assignedSetlists || {};
        if (!this.assignedSetlistsContainer) return;
        this.assignedSetlistsContainer.innerHTML = '';

        const setlistIds = Object.keys(assignedSetlists);
        if (setlistIds.length === 0) {
            this.assignedSetlistsContainer.innerHTML = '<div style="color: #64748b; font-size: 14px;">No setlists assigned yet.</div>';
            this.checkDirtyState();
            return;
        }

        setlistIds.forEach(setlistId => {
            const setlist = assignedSetlists[setlistId];
            const songs = setlist.songs ? Object.values(setlist.songs) : [];
            const displaySongs = songs.map(s => s.title).join(', ');
            
            const card = document.createElement('div');
            card.className = 'assigned-song-item';
            card.innerHTML = `
                <div style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    <div style="font-weight: 600; font-size: 0.95rem; color: #1e293b;">${setlist.name}</div>
                    <div style="font-size: 0.8rem; color: #64748b; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${displaySongs}">
                        Songs: ${displaySongs || 'None'}
                    </div>
                </div>
                <button class="del-setlist-btn" style="background: none; border: none; cursor: pointer; color: #ef4444; font-size: 18px; line-height: 1; padding: 0 4px;" title="Unassign Setlist">&times;</button>
            `;

            const delBtn = card.querySelector('.del-setlist-btn');
            delBtn.addEventListener('click', () => {
                delete this._currentProgress.assignedSetlists[setlistId];
                
                if (setlist.songs) {
                    const songsArray = Array.isArray(setlist.songs) ? setlist.songs : Object.values(setlist.songs);
                    songsArray.forEach(song => {
                        if (song && song.id) {
                            const assignedSong = this._currentProgress.assignedSongs[song.id];
                            if (assignedSong && assignedSong.note === `From setlist: ${setlist.name}`) {
                                delete this._currentProgress.assignedSongs[song.id];
                            }
                        }
                    });
                }
                
                this._renderAssignedSetlists();
                this._renderAssignedSongs();
            });

            this.assignedSetlistsContainer.appendChild(card);
        });

        this.checkDirtyState();
    }

    _syncLegacyHomework() {
        const homeworks = this._currentProgress.homeworks || [];
        const activeHomework = homeworks.find(h => !h.completed) || homeworks[0] || null;
        if (activeHomework) {
            this._currentProgress.homework = {
                text: activeHomework.text,
                date: activeHomework.date
            };
        } else {
            this._currentProgress.homework = { text: '', date: '' };
        }
    }

    _renderHomeworks() {
        const container = this.homeworkListContainer;
        if (!container) return;
        
        container.innerHTML = '';
        const homeworks = this._currentProgress.homeworks || [];
        
        if (homeworks.length === 0) {
            container.innerHTML = '<p style="color: #64748b; font-size: 0.85rem; padding: 4px 0;">No homework assigned yet.</p>';
            this.checkDirtyState();
            return;
        }
        
        homeworks.forEach((hw, idx) => {
            const row = document.createElement('div');
            row.style.cssText = 'display: flex; align-items: flex-start; gap: 10px; background: #ffffff; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; box-sizing: border-box;';
            if (hw.completed) {
                row.style.background = '#f8fafc';
                row.style.borderColor = '#cbd5e1';
                row.style.opacity = '0.8';
            }
            
            const checkedAttr = hw.completed ? 'checked' : '';
            const textDecoration = hw.completed ? 'line-through' : 'none';
            const textColor = hw.completed ? '#64748b' : '#1e293b';
            
            let dateStr = '';
            if (hw.date) {
                const dateObj = new Date(hw.date + 'T00:00:00');
                dateStr = 'Due: ' + dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
            }
            
            row.innerHTML = `
                <input type="checkbox" class="hw-complete-checkbox" ${checkedAttr} style="margin-top: 3px; cursor: pointer; width: 16px; height: 16px;">
                <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 0.85rem; color: ${textColor}; text-decoration: ${textDecoration}; white-space: pre-wrap; word-break: break-word; line-height: 1.4;">${hw.text}</div>
                    ${dateStr ? `<div style="font-size: 0.75rem; color: #3b82f6; font-weight: 600; margin-top: 4px;">${dateStr}</div>` : ''}
                </div>
                <button class="del-hw-btn" style="background: none; border: none; cursor: pointer; color: #ef4444; font-size: 18px; line-height: 1; padding: 0 4px;" title="Delete Homework">&times;</button>
            `;
            
            const checkbox = row.querySelector('.hw-complete-checkbox');
            checkbox.addEventListener('change', (e) => {
                hw.completed = e.target.checked;
                this._syncLegacyHomework();
                this._renderHomeworks();
            });
            
            const delBtn = row.querySelector('.del-hw-btn');
            delBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to delete this homework assignment?')) {
                    this._currentProgress.homeworks.splice(idx, 1);
                    this._syncLegacyHomework();
                    this._renderHomeworks();
                }
            });
            
            container.appendChild(row);
        });
        
        this.checkDirtyState();
    }
}

// Instantiate on load
window.addEventListener('DOMContentLoaded', () => {
    window.editor = new StudentDetailEditor();
});
