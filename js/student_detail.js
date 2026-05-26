// Student Progress Detail / Editor for Teachers
class StudentDetailEditor {
    constructor() {
        this.firebaseManager = new FirebaseManager();
        this.studentEmailDisplay = document.getElementById('studentEmailDisplay');
        this.studentSubtitle = document.getElementById('studentSubtitle');
        this.assignedSongsContainer = document.getElementById('spAssignedSongsContainer');
        this.homeworkDate = document.getElementById('spHomeworkDate');
        this.homeworkText = document.getElementById('spHomeworkText');
        this.linksContainer = document.getElementById('spLinksContainer');
        this.goalsContainer = document.getElementById('spGoalsContainer');
        this.goalsHeaderTitle = document.getElementById('spGoalsHeaderTitle');

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
                this.studentEmail = studentData.email || 'Connected Student';
                this.studentEmailDisplay.textContent = this.studentEmail;
                this.studentSubtitle.textContent = `Managing ${this.studentEmail}`;
            }

            // Load Teacher's Songs for Dropdown
            const songsSnapshot = await this.firebaseManager.database.ref(`users/${teacherUser.uid}/songs`).once('value');
            const songsData = songsSnapshot.val() || {};
            this.assignSongSelect.innerHTML = '<option value="">-- Select a Song --</option>';

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
                    }
                });
            }

            // 2. Add Teacher's Custom Songs
            Object.keys(songsData).forEach(songId => {
                const song = songsData[songId];
                if (song && song.title) {
                    const opt = document.createElement('option');
                    opt.value = songId;
                    opt.textContent = `[Custom] ${song.title} - ${song.artist || 'Unknown'}`;
                    this.assignSongSelect.appendChild(opt);
                }
            });

            // Load Student's Progress
            const result = await this.firebaseManager.getStudentProgress(this.studentUid);
            if (!result.success) {
                alert('Failed to load progress: ' + result.error);
                return;
            }

            this._currentProgress = result.progress || {};
            if (!this._currentProgress.homework) this._currentProgress.homework = { text: '', date: '' };
            if (!this._currentProgress.goals) this._currentProgress.goals = [];
            if (!this._currentProgress.links) this._currentProgress.links = [];
            if (!this._currentProgress.assignedSongs) this._currentProgress.assignedSongs = {};

            // Populate Homework Inputs
            this.homeworkDate.value = this._currentProgress.homework.date || '';
            this.homeworkText.value = this._currentProgress.homework.text || '';

            // Render Lists
            this._renderGoals();
            this._renderLinks();
            this._renderAssignedSongs();

            // Store a deep clone AFTER rendering so checkDirtyState has the correct baseline
            // (rendering may trigger checkDirtyState, which needs _initialProgress to be set)
            this._initialProgress = JSON.parse(JSON.stringify(this._currentProgress));

            // Now run a final dirty check so the save button starts hidden
            this.checkDirtyState();

        } catch (e) {
            console.error('Error loading student detail editor', e);
            alert('Failed to load dashboard.');
        }
    }

    setupEventListeners() {
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
                // Collect homework
                this._currentProgress.homework = {
                    text: this.homeworkText.value.trim(),
                    date: this.homeworkDate.value
                };

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

                    setTimeout(() => {
                        this.saveBtn.innerHTML = '💾 SAVE';
                        this.saveBtn.style.background = '#3b82f6';
                        this.saveBtn.disabled = false;
                        this.checkDirtyState(); // This will hide the button because it is now clean!
                    }, 2000);
                } else {
                    alert('Save failed: ' + result.error);
                    this.saveBtn.innerHTML = '💾 SAVE';
                    this.saveBtn.style.background = '#3b82f6';
                    this.saveBtn.disabled = false;
                }
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

        // Build temporary comparison progress object matching what we save
        const comparisonProgress = {
            ...this._currentProgress,
            homework: {
                text: this.homeworkText ? this.homeworkText.value.trim() : '',
                date: this.homeworkDate ? this.homeworkDate.value : ''
            }
        };

        const isDirty = JSON.stringify(this._initialProgress) !== JSON.stringify(comparisonProgress);

        if (isDirty) {
            if (this.saveBtn) this.saveBtn.classList.remove('hidden');
        } else {
            if (this.saveBtn) this.saveBtn.classList.add('hidden');
        }
    }
}

// Instantiate on load
window.addEventListener('DOMContentLoaded', () => {
    window.editor = new StudentDetailEditor();
});
