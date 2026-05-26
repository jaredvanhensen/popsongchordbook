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

            // Fetch Teacher Name
            const teacherSnapshot = await this.firebaseManager.database.ref(`users/${teacherUid}`).once('value');
            const teacherData = teacherSnapshot.val();
            if (teacherData && teacherData.email) {
                this.teacherNameDisplay.textContent = teacherData.email.split('@')[0];
            } else {
                this.teacherNameDisplay.textContent = 'Your Teacher';
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
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.studentDashboard = new StudentDashboard();
});
