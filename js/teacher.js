// Teacher Dashboard Logic

class TeacherDashboard {
    constructor() {
        this.firebaseManager = new FirebaseManager();
        this.teacherNameDisplay = document.getElementById('teacherNameDisplay');
        this.teacherCodeBox = document.getElementById('teacherCodeBox');
        this.studentsGrid = document.getElementById('studentsGrid');
        this.studentCountBadge = document.getElementById('studentCountBadge');
        this.photoInput = document.getElementById('teacherPhotoInput');
        this.uploadBtn = document.querySelector('.upload-banner-btn');
        this.bannerPlaceholder = document.querySelector('.teacher-banner-placeholder');
        this.shareTeacherLinkBtn = document.getElementById('shareTeacherLinkBtn');
        this.publicEmailInput = document.getElementById('teacherPublicEmailInput');
        this.savePublicEmailBtn = document.getElementById('savePublicEmailBtn');
        this.publicEmailStatus = document.getElementById('publicEmailStatus');
        this.unreadCounts = {};

        this.init();
    }

    async init() {
        // Initialize Firebase
        await this.firebaseManager.initialize();

        // Wire up non-data-dependent event listeners immediately
        this.setupEventListeners();

        // Wait for auth
        await new Promise(resolve => {
            const unsubscribe = firebase.auth().onAuthStateChanged(user => {
                if (user) {
                    this.loadDashboard(user);
                } else {
                    window.location.href = 'index.html';
                }
                unsubscribe();
                resolve();
            });
        });
    }

    setupEventListeners() {
        if (this.uploadBtn && this.photoInput) {
            this.uploadBtn.addEventListener('click', () => {
                this.photoInput.click();
            });

            this.photoInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.handlePhotoUpload(e.target.files[0]);
                }
            });
        }

        if (this.shareTeacherLinkBtn) {
            this.shareTeacherLinkBtn.addEventListener('click', () => {
                const code = (this.teacherCodeBox.textContent || '').trim();
                if (!code || code === '...' || code === 'UNKNOWN') {
                    alert('Your teacher code is not loaded yet. Please wait a moment and try again.');
                    return;
                }
                
                // Use production domain when on localhost
                let origin = window.location.origin;
                if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
                    origin = 'https://popsongchordbook.com';
                }
                const url = origin + '/songlist.html?teacher=' + code;
                
                // Try native share first (mobile)
                if (navigator.share) {
                    navigator.share({
                        title: 'Join my music class!',
                        text: 'Click the link below to connect with your teacher on PopSongChordBook.',
                        url: url
                    }).catch(err => {
                        if (err.name !== 'AbortError') console.error('Share failed:', err);
                    });
                    return;
                }

                // Fallback: copy to clipboard
                const handleSuccess = () => {
                    const originalHTML = this.shareTeacherLinkBtn.innerHTML;
                    this.shareTeacherLinkBtn.innerHTML = '✅ Copied!';
                    this.shareTeacherLinkBtn.style.background = '#16a34a';
                    setTimeout(() => {
                        this.shareTeacherLinkBtn.innerHTML = originalHTML;
                        this.shareTeacherLinkBtn.style.background = '#3b82f6';
                    }, 2000);
                };
                const handleError = () => {
                    prompt('Copy this link to share with your students:', url);
                };

                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(url).then(handleSuccess).catch(handleError);
                } else {
                    try {
                        const ta = document.createElement('textarea');
                        ta.value = url;
                        ta.style.position = 'fixed';
                        ta.style.left = '-9999px';
                        document.body.appendChild(ta);
                        ta.focus();
                        ta.select();
                        const ok = document.execCommand('copy');
                        ta.remove();
                        if (ok) handleSuccess(); else handleError();
                    } catch (e) {
                        handleError();
                    }
                }
            });
        }

        const deleteTeacherPageBtn = document.getElementById('deleteTeacherPageBtn');
        const deleteTeacherModal = document.getElementById('deleteTeacherModal');
        const cancelDeleteBtn = document.getElementById('cancelDeleteTeacherBtn');
        const confirmDeleteBtn = document.getElementById('confirmDeleteTeacherBtn');

        if (deleteTeacherPageBtn && deleteTeacherModal) {
            deleteTeacherPageBtn.addEventListener('click', () => {
                deleteTeacherModal.classList.remove('hidden');
                deleteTeacherModal.style.display = 'flex';
            });

            cancelDeleteBtn.addEventListener('click', () => {
                deleteTeacherModal.classList.add('hidden');
                deleteTeacherModal.style.display = 'none';
            });

            confirmDeleteBtn.addEventListener('click', async () => {
                const origText = confirmDeleteBtn.innerHTML;
                confirmDeleteBtn.textContent = 'Deleting...';
                confirmDeleteBtn.disabled = true;

                try {
                    const uid = this.firebaseManager.currentUser.uid;
                    await this.firebaseManager.database.ref(`users/${uid}`).update({
                        role: 'student'
                    });
                    
                    window.location.href = 'songlist.html';
                } catch (e) {
                    alert('Failed to delete teacher page: ' + e.message);
                    confirmDeleteBtn.innerHTML = origText;
                    confirmDeleteBtn.disabled = false;
                }
            });
        }

        if (this.savePublicEmailBtn && this.publicEmailInput) {
            this.savePublicEmailBtn.addEventListener('click', async () => {
                const email = this.publicEmailInput.value.trim();
                const user = this.firebaseManager.currentUser;
                if (!user) return;
                
                this.savePublicEmailBtn.disabled = true;
                this.savePublicEmailBtn.textContent = '...';
                try {
                    await this.firebaseManager.database.ref(`users/${user.uid}`).update({
                        publicEmail: email
                    });
                    this.publicEmailStatus.style.display = 'inline';
                    setTimeout(() => {
                        this.publicEmailStatus.style.display = 'none';
                    }, 2000);
                } catch (e) {
                    alert('Failed to save email: ' + e.message);
                } finally {
                    this.savePublicEmailBtn.disabled = false;
                    this.savePublicEmailBtn.textContent = 'Save';
                }
            });
        }
    }

    async loadDashboard(user) {
        try {
            await this.firebaseManager.initialize();

            // Load Teacher Profile
            const snapshot = await this.firebaseManager.database.ref(`users/${user.uid}`).once('value');
            const userData = snapshot.val();

            if (!userData || userData.role !== 'teacher') {
                alert("You don't have access to the Teacher Dashboard. Please upgrade from your Profile first.");
                window.location.href = 'songlist.html';
                return;
            }

            // Display Info
            this.teacherNameDisplay.textContent = userData.email ? userData.email.split('@')[0] : 'Teacher';
            this.teacherCodeBox.textContent = userData.teacherCode || 'UNKNOWN';
            if (this.publicEmailInput) {
                this.publicEmailInput.value = userData.publicEmail || '';
            }

            // Load Avatar
            let avatarUrl = await this.firebaseManager.getUserAvatar(user.uid);
            if (!avatarUrl) avatarUrl = user.photoURL;
            if (avatarUrl) {
                this.updateAvatarUI(avatarUrl);
            }

            // Load Students
            const result = await this.firebaseManager.getConnectedStudents();
            if (result.success) {
                this.renderStudents(result.students);
            } else {
                this.showError('Failed to load students: ' + result.error);
            }

            // Listen to student messages in real-time for unread counts
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
            console.error('Dashboard load error', e);
            this.showError('Failed to load dashboard.');
        }
    }

    renderStudents(students) {
        this.studentCountBadge.textContent = students.length;
        this.studentsGrid.innerHTML = '';

        if (students.length === 0) {
            this.studentsGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #64748b;">
                    <div class="empty-state-icon" style="font-size: 48px; margin-bottom: 15px;">👥</div>
                    <p>No students connected yet.</p>
                    <p style="font-size: 13px; margin-top: 10px;">Share your Teacher Code with your students to get started!</p>
                </div>
            `;
            return;
        }

        students.forEach(student => {
            const dateStr = student.createdAt 
                ? new Date(student.createdAt).toLocaleDateString()
                : 'Unknown date';

            const card = document.createElement('div');
            card.className = 'student-card';
            card.dataset.uid = student.uid;
            card.style.cursor = 'pointer';
            card.innerHTML = `
                <div class="student-email" style="font-weight: 600; color: #334155; margin-bottom: 5px; font-size: 14px;">${student.email}</div>
                <div class="student-meta" style="color: #64748b; font-size: 11px; margin-bottom: 10px;">Connected: ${dateStr}</div>
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
            // remove existing badge if any
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

    showError(msg) {
        this.studentsGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; color: #dc2626;">
                <div class="empty-state-icon">❌</div>
                <p>${msg}</p>
            </div>
        `;
    }

    async handlePhotoUpload(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please select an image.');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('Image is too large. Max 5MB.');
            return;
        }

        try {
            this.uploadBtn.textContent = '...';
            this.uploadBtn.disabled = true;

            const resizedUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = 200;
                        canvas.height = 200;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, 200, 200);
                        resolve(canvas.toDataURL('image/jpeg', 0.8));
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            });

            const result = await this.firebaseManager.uploadUserAvatar(resizedUrl);
            
            if (result.success) {
                this.updateAvatarUI(resizedUrl);
            } else {
                alert('Upload failed: ' + result.error);
            }
        } catch (e) {
            console.error(e);
            alert('Error processing photo');
        } finally {
            this.uploadBtn.textContent = '📷';
            this.uploadBtn.disabled = false;
            this.photoInput.value = '';
        }
    }

    updateAvatarUI(url) {
        this.bannerPlaceholder.innerHTML = `
            <img src="${url}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">
        `;
        this.bannerPlaceholder.appendChild(this.uploadBtn);
        this.bannerPlaceholder.appendChild(this.photoInput);
    }
}

// Initialize when ready
document.addEventListener('DOMContentLoaded', () => {
    window.teacherDashboard = new TeacherDashboard();
});
