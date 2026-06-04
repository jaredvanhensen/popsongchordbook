// Connected Students Page Logic

class TeacherStudentsDashboard {
    constructor() {
        this.firebaseManager = new FirebaseManager();
        this.studentsGrid = document.getElementById('studentsGrid');
        this.searchInput = document.getElementById('studentSearchInput');
        this.addNewStudentBtn = document.getElementById('addNewStudentBtn');
        
        // Add Student Modal elements
        this.addStudentModal = document.getElementById('addStudentModal');
        this.closeAddStudentModalBtn = document.getElementById('closeAddStudentModalBtn');
        this.addStudentForm = document.getElementById('addStudentForm');
        this.addStudentNameInput = document.getElementById('addStudentNameInput');
        this.addStudentEmailInput = document.getElementById('addStudentEmailInput');
        
        this.students = [];
        this.allProgress = {};
        this.unreadCounts = {};
        this.teacherCode = '...';
        this.teacherName = '...';

        // Override window.alert with custom Alert Modal
        const originalAlert = window.alert;
        window.alert = (message) => {
            const modal = document.getElementById('customAlertModal');
            const msgEl = document.getElementById('customAlertMessage');
            if (modal && msgEl) {
                msgEl.textContent = message;
                modal.classList.remove('hidden');
                modal.style.display = 'flex';
            } else {
                originalAlert(message);
            }
        };
        const closeAlertBtn = document.getElementById('closeCustomAlertBtn');
        if (closeAlertBtn) {
            closeAlertBtn.addEventListener('click', () => {
                const modal = document.getElementById('customAlertModal');
                if (modal) {
                    modal.classList.add('hidden');
                    modal.style.display = 'none';
                }
            });
        }

        this.init();
    }

    async init() {
        await this.firebaseManager.initialize();
        this.setupEventListeners();

        // Wait for auth
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                this.loadDashboard(user);
            } else {
                window.location.href = 'index.html';
            }
        });
    }

    setupEventListeners() {
        if (this.addNewStudentBtn) {
            this.addNewStudentBtn.addEventListener('click', () => {
                this.openAddStudentModal();
            });
        }

        if (this.closeAddStudentModalBtn) {
            this.closeAddStudentModalBtn.addEventListener('click', () => {
                this.closeAddStudentModal();
            });
        }

        if (this.addStudentForm) {
            this.addStudentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSendStudentInvitation();
            });
        }

        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => {
                this.renderStudents();
            });
        }
    }

    async loadDashboard(user) {
        try {
            // Load Teacher Info
            const snapshot = await this.firebaseManager.database.ref(`users/${user.uid}`).once('value');
            const teacherData = snapshot.val() || {};
            
            // Format and display name with capital letters
            let rawName = teacherData.name || teacherData.displayName || user.displayName || 'Teacher';
            this.teacherName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
            this.teacherCode = teacherData.teacherCode || 'UNKNOWN';

            // Real-time listener for student progress & goals
            this.firebaseManager.database.ref(`studentProgress/${user.uid}`).on('value', (snap) => {
                this.allProgress = snap.val() || {};
                this.renderStudents();
            });

            // Fetch Connected Students roster
            const result = await this.firebaseManager.getConnectedStudents();
            if (result.success) {
                this.students = result.students || [];
                this.renderStudents();
            } else {
                this.showError('Failed to load students: ' + result.error);
            }

            // Real-time listener for messages unread counts
            this.firebaseManager.database.ref(`studentMessages/${user.uid}`).on('value', (messagesSnapshot) => {
                const allMessages = messagesSnapshot.val() || {};
                this.unreadCounts = {};
                
                Object.keys(allMessages).forEach(studentUid => {
                    const studentMsgs = allMessages[studentUid] || {};
                    let count = 0;
                    Object.values(studentMsgs).forEach(msg => {
                        if (msg.sender === 'student' && msg.readByTeacher === false) {
                            count++;
                        }
                    });
                    if (count > 0) {
                        this.unreadCounts[studentUid] = count;
                    }
                });
                
                this.updateUnreadBadges();
            });

        } catch (e) {
            console.error('Students dashboard load error', e);
            this.showError('Failed to load students list.');
        }
    }

    renderStudents() {
        if (!this.studentsGrid) return;
        
        const filterText = this.searchInput ? this.searchInput.value.toLowerCase().trim() : '';
        
        // Filter students list
        const filteredStudents = this.students.filter(student => {
            const email = (student.email || '').toLowerCase();
            const name = (student.name || '').toLowerCase();
            return email.includes(filterText) || name.includes(filterText);
        });

        this.studentsGrid.innerHTML = '';

        if (filteredStudents.length === 0) {
            this.studentsGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <p>${this.students.length === 0 ? 'No students connected yet.' : 'No matching students found.'}</p>
                    <p style="font-size: 13px; margin-top: 10px;">
                        ${this.students.length === 0 ? 'Share your Teacher Code to connect students!' : 'Try adjusting your search query.'}
                    </p>
                </div>
            `;
            return;
        }

        filteredStudents.forEach(student => {
            const dateStr = student.createdAt 
                ? new Date(student.createdAt).toLocaleDateString()
                : 'Unknown date';

            const progress = this.allProgress[student.uid] || {};
            const dueDate = (progress.homework && progress.homework.date) ? progress.homework.date : null;
            let dueDateFormatted = 'Not set';
            if (dueDate) {
                try {
                    const d = new Date(dueDate);
                    if (!isNaN(d.getTime())) {
                        dueDateFormatted = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
                    } else {
                        dueDateFormatted = dueDate;
                    }
                } catch (e) {
                    dueDateFormatted = dueDate;
                }
            }

            const goals = progress.goals || [];
            const achievedCount = goals.filter(g => g.completed).length;
            const totalCount = goals.length || 19;

            // Format username to capital letter
            const emailPrefix = student.email.split('@')[0];
            const capitalizedPrefix = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
            const displayName = student.name ? student.name : capitalizedPrefix;

            // Generate avatar html
            let avatarHtml = '';
            if (student.avatar) {
                avatarHtml = `<img src="${student.avatar}" alt="${displayName}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid #e2e8f0; flex-shrink: 0;">`;
            } else {
                // Calculate initials
                let initials = '';
                if (student.name) {
                    const parts = student.name.trim().split(/\s+/);
                    if (parts.length >= 2) {
                        initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                    } else if (parts.length === 1 && parts[0].length > 0) {
                        initials = parts[0][0].toUpperCase();
                    }
                }
                if (!initials) {
                    initials = emailPrefix.charAt(0).toUpperCase();
                }

                // Deterministic color
                const colors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
                let hash = 0;
                const seedStr = student.uid || student.email || '';
                for (let i = 0; i < seedStr.length; i++) {
                    hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
                }
                const colorIndex = Math.abs(hash) % colors.length;
                const avatarColor = colors[colorIndex];

                avatarHtml = `
                    <div style="width: 44px; height: 44px; border-radius: 50%; background-color: ${avatarColor}; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px; flex-shrink: 0; border: 2px solid #e2e8f0;">
                        ${initials}
                    </div>
                `;
            }

            const card = document.createElement('div');
            card.className = 'student-card';
            card.dataset.uid = student.uid;
            card.style.cursor = 'pointer';
            card.innerHTML = `
                <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px;">
                    ${avatarHtml}
                    <div style="min-width: 0; flex: 1;">
                        <div class="student-email" style="font-weight: 700; color: #1e293b; font-size: 15px; margin-bottom: 0; padding-right: 30px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${displayName}">
                            ${displayName}
                        </div>
                        <div style="font-size: 11px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${student.email}">
                            ${student.email}
                        </div>
                    </div>
                </div>
                <div class="student-meta" style="color: #64748b; font-size: 11px; margin-bottom: 5px; display: flex; flex-direction: column; gap: 4px;">
                    <div>Connected: ${dateStr}</div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; padding-top: 6px; border-top: 1px solid #e2e8f0;">
                        <span>📅 Next Due Date:</span>
                        <span style="font-weight: 600; color: ${dueDate ? '#166534' : '#64748b'};">${dueDateFormatted}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span>🎯 Goals Achieved:</span>
                        <span style="font-weight: 600; color: ${achievedCount > 0 ? '#1e40af' : '#64748b'};">${achievedCount} / ${totalCount}</span>
                    </div>
                </div>
            `;

            card.addEventListener('click', () => {
                window.location.href = `student_detail.html?studentId=${student.uid}`;
            });

            this.studentsGrid.appendChild(card);
        });

        this.updateUnreadBadges();
    }

    updateUnreadBadges() {
        if (!this.studentsGrid) return;
        const cards = this.studentsGrid.querySelectorAll('.student-card');
        cards.forEach(card => {
            const uid = card.dataset.uid;
            
            // Remove existing badge if any
            const existingBadge = card.querySelector('.unread-badge');
            if (existingBadge) {
                existingBadge.remove();
            }
            
            const count = this.unreadCounts[uid] || 0;
            if (count > 0) {
                const badge = document.createElement('div');
                badge.className = 'unread-badge';
                badge.textContent = count;
                card.appendChild(badge);
            }
        });
    }

    openAddStudentModal() {
        if (!this.addStudentModal) return;
        if (this.addStudentNameInput) this.addStudentNameInput.value = '';
        if (this.addStudentEmailInput) this.addStudentEmailInput.value = '';
        this.addStudentModal.classList.remove('hidden');
        this.addStudentModal.style.display = 'flex';
    }

    closeAddStudentModal() {
        if (!this.addStudentModal) return;
        this.addStudentModal.classList.add('hidden');
        this.addStudentModal.style.display = 'none';
    }

    handleSendStudentInvitation() {
        const name = this.addStudentNameInput.value.trim();
        const email = this.addStudentEmailInput.value.trim();
        
        if (!name || !email) {
            alert('Please enter both name and email.');
            return;
        }
        
        const subject = encodeURIComponent("Invitation to join my music class on PopSongChordBook");
        const body = encodeURIComponent(
`Hi ${name},\n\n` +
`I would like to invite you to join my music class on PopSongChordBook.com, where we can share your progress and manage your lesson schedule!\n\n` +
`Here are the simple steps to connect with me:\n\n` +
`1. Register/Login to your account on the https://www.popsongchordbook.com website.\n` +
`2. Open the Profile & Settings Menu at the top right corner.\n` +
`3. Find the "Teacher / Student Connection" section and enter my Teacher Code:\n` +
`   ${this.teacherCode}\n\n` +
`To help you find it, you can view this screenshot instruction: https://www.popsongchordbook.com/images/connect_teacher_guide.png?v=${Date.now()}\n\n` +
`Looking forward to practicing together!\n\n` +
`Best regards,\n` +
`${this.teacherName}`
        );
        
        const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;
        window.location.href = mailtoUrl;
        
        this.closeAddStudentModal();
    }



    showError(msg) {
        if (this.studentsGrid) {
            this.studentsGrid.innerHTML = `
                <div class="empty-state" style="color: #dc2626;">
                    <div class="empty-state-icon">❌</div>
                    <p>${msg}</p>
                </div>
            `;
        }
    }
}

// Initialize when ready
document.addEventListener('DOMContentLoaded', () => {
    window.teacherStudentsDashboard = new TeacherStudentsDashboard();
});
