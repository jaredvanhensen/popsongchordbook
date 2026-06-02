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
        this.students = [];

        // Tabs
        this.tabStudentsBtn = document.getElementById('tabStudentsBtn');
        this.tabGroupsBtn = document.getElementById('tabGroupsBtn');
        this.tabStudentsContent = document.getElementById('tabStudentsContent');
        this.tabGroupsContent = document.getElementById('tabGroupsContent');
        this.groupCountBadge = document.getElementById('groupCountBadge');

        // Goals Settings Editor Modal
        this.goalsEditorModal = document.getElementById('goalsEditorModal');
        this.openGoalsEditorBtn = document.getElementById('openGoalsEditorBtn');
        this.closeGoalsEditorBtn = document.getElementById('closeGoalsEditorBtn');

        // Goals Settings Editor elements
        this.goalsSetSelect = document.getElementById('goalsSetSelect');
        this.createGoalSetBtn = document.getElementById('createGoalSetBtn');
        this.deleteGoalSetBtn = document.getElementById('deleteGoalSetBtn');
        this.goalsListContainer = document.getElementById('goalsListContainer');
        this.newGoalInput = document.getElementById('newGoalInput');
        this.addGoalToSetBtn = document.getElementById('addGoalToSetBtn');
        this.resetGoalsToDefaultBtn = document.getElementById('resetGoalsToDefaultBtn');
        this.saveGoalsSettingsBtn = document.getElementById('saveGoalsSettingsBtn');
        this.goalsCountLabel = document.getElementById('goalsCountLabel');

        // Local state for goals
        this.teacherSettings = { defaultGoals: null, customGoalSets: {} };
        this.activeGoalsSetType = 'default';
        this.editingGoalsList = [];
        this.goalsEditorInitialized = false;
        
        // Groups Management
        this.createGroupBtn = document.getElementById('createGroupBtn');
        this.groupsGrid = document.getElementById('groupsGrid');
        
        // Group Modal
        this.groupModal = document.getElementById('groupModal');
        this.groupNameInput = document.getElementById('groupNameInput');
        this.groupStudentChecklist = document.getElementById('groupStudentChecklist');
        this.closeGroupModalBtn = document.getElementById('closeGroupModalBtn');
        this.saveGroupBtn = document.getElementById('saveGroupBtn');
        this.editGroupId = document.getElementById('editGroupId');
        this.groups = {}; // local cached groups { groupId: groupObj }

        // Add Student Modal elements
        this.addStudentModal = document.getElementById('addStudentModal');
        this.closeAddStudentModalBtn = document.getElementById('closeAddStudentModalBtn');
        this.addStudentForm = document.getElementById('addStudentForm');
        this.addStudentNameInput = document.getElementById('addStudentNameInput');
        this.addStudentEmailInput = document.getElementById('addStudentEmailInput');

        // Booking Type & Group Select
        this.bookingStudentContainer = document.getElementById('bookingStudentContainer');
        this.bookingGroupContainer = document.getElementById('bookingGroupContainer');
        this.bookingGroupSelect = document.getElementById('bookingGroupSelect');

        // Deletion Group Options Modal
        this.deleteGroupOptionsModal = document.getElementById('deleteGroupOptionsModal');
        this.deleteGroupOccurrenceBtn = document.getElementById('deleteGroupOccurrenceBtn');
        this.deleteGroupSeriesBtn = document.getElementById('deleteGroupSeriesBtn');
        this.cancelDeleteGroupOptionsBtn = document.getElementById('cancelDeleteGroupOptionsBtn');

        // Calendar properties
        this.currentCalendarDate = new Date();
        this.selectedCalendarDate = new Date();
        this.lessonsByDate = {}; // format: { "YYYY-MM-DD": [ lessonObj, ... ] }
        
        // Calendar DOM elements
        this.calendarGrid = document.getElementById('calendarGrid');
        this.currentMonthYearSpan = document.getElementById('currentMonthYear');
        this.selectedDayPanel = document.getElementById('selectedDayPanel');
        this.selectedDayLabel = document.getElementById('selectedDayLabel');
        this.dayLessonsList = document.getElementById('dayLessonsList');
        
        // Modals
        this.bookingModal = document.getElementById('bookingModal');
        this.bookingDateInput = document.getElementById('bookingDateInput');
        this.bookingTimeInput = document.getElementById('bookingTimeInput');
        this.bookingStudentSelect = document.getElementById('bookingStudentSelect');
        this.bookingRecurrenceSelect = document.getElementById('bookingRecurrenceSelect');
        this.recurrenceDurationSection = document.getElementById('recurrenceDurationSection');
        this.bookingDurationSelect = document.getElementById('bookingDurationSelect');
        this.saveBookingBtn = document.getElementById('saveBookingBtn');
        this.closeBookingModalBtn = document.getElementById('closeBookingModalBtn');
        
        // Deletion options modal
        this.deleteOptionsModal = document.getElementById('deleteOptionsModal');
        this.deleteOccurrenceBtn = document.getElementById('deleteOccurrenceBtn');
        this.deleteFutureBtn = document.getElementById('deleteFutureBtn');
        this.deleteSeriesBtn = document.getElementById('deleteSeriesBtn');
        this.cancelDeleteOptionsBtn = document.getElementById('cancelDeleteOptionsBtn');
        this.activeDeleteLesson = null;

        // Custom alert override
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
        // Initialize Firebase
        await this.firebaseManager.initialize();

        // Wire up non-data-dependent event listeners immediately
        this.setupEventListeners();

        // Populate time dropdown with 5-minute intervals between 06:00 and 23:00
        this.populateTimeDropdown();

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

        const teacherSettingsBtn = document.getElementById('teacherSettingsBtn');
        const teacherSettingsMenu = document.getElementById('teacherSettingsMenu');

        if (teacherSettingsBtn && teacherSettingsMenu) {
            teacherSettingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                teacherSettingsMenu.classList.toggle('hidden');
            });

            document.addEventListener('click', (e) => {
                if (!teacherSettingsMenu.classList.contains('hidden') &&
                    !teacherSettingsMenu.contains(e.target) &&
                    e.target !== teacherSettingsBtn &&
                    !teacherSettingsBtn.contains(e.target)) {
                    teacherSettingsMenu.classList.add('hidden');
                }
            });
        }

        const sendBulkEmailBtn = document.getElementById('sendBulkEmailBtn');
        if (sendBulkEmailBtn) {
            sendBulkEmailBtn.addEventListener('click', () => {
                if (teacherSettingsMenu) {
                    teacherSettingsMenu.classList.add('hidden');
                }
                const students = this.students || [];
                const emails = students
                    .map(s => (s.email || '').trim())
                    .filter(email => email.length > 0 && email !== 'Unknown');

                if (emails.length === 0) {
                    alert('You do not have any connected students with email addresses.');
                    return;
                }

                const mailtoUrl = `mailto:${emails.join(',')}`;
                window.location.href = mailtoUrl;
            });
        }

        const addNewStudentBtn = document.getElementById('addNewStudentBtn');
        if (addNewStudentBtn) {
            addNewStudentBtn.addEventListener('click', () => {
                if (teacherSettingsMenu) {
                    teacherSettingsMenu.classList.add('hidden');
                }
                this.openAddStudentModal();
            });
        }

        const exportCalendarBtn = document.getElementById('exportCalendarBtn');
        if (exportCalendarBtn) {
            exportCalendarBtn.addEventListener('click', () => {
                if (teacherSettingsMenu) {
                    teacherSettingsMenu.classList.add('hidden');
                }
                this.handleExportCalendar();
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

        if (deleteTeacherPageBtn && deleteTeacherModal) {
            deleteTeacherPageBtn.addEventListener('click', () => {
                if (teacherSettingsMenu) {
                    teacherSettingsMenu.classList.add('hidden');
                }
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

        // Calendar month navigation
        const prevMonthBtn = document.getElementById('prevMonthBtn');
        const nextMonthBtn = document.getElementById('nextMonthBtn');
        if (prevMonthBtn && nextMonthBtn) {
            prevMonthBtn.addEventListener('click', () => {
                this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() - 1);
                this.renderCalendar();
            });
            nextMonthBtn.addEventListener('click', () => {
                this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() + 1);
                this.renderCalendar();
            });
        }

        // Add lesson button
        const addLessonBtn = document.getElementById('addLessonBtn');
        if (addLessonBtn) {
            addLessonBtn.addEventListener('click', () => {
                this.openBookingModal();
            });
        }

        // Close booking modal
        if (this.closeBookingModalBtn) {
            this.closeBookingModalBtn.addEventListener('click', () => {
                this.closeBookingModal();
            });
        }

        // Recurrence change handler
        if (this.bookingRecurrenceSelect) {
            this.bookingRecurrenceSelect.addEventListener('change', () => {
                if (this.bookingRecurrenceSelect.value !== 'none') {
                    this.recurrenceDurationSection.style.display = 'block';
                } else {
                    this.recurrenceDurationSection.style.display = 'none';
                }
            });
        }

        // Save Booking button
        if (this.saveBookingBtn) {
            this.saveBookingBtn.addEventListener('click', () => {
                this.handleSaveBooking();
            });
        }

        // Tab switching
        if (this.tabStudentsBtn && this.tabGroupsBtn) {
            this.tabStudentsBtn.addEventListener('click', () => {
                this.switchTab('students');
            });
            this.tabGroupsBtn.addEventListener('click', () => {
                this.switchTab('groups');
            });
        }
        
        // Goals modal listeners
        if (this.openGoalsEditorBtn && this.goalsEditorModal) {
            this.openGoalsEditorBtn.addEventListener('click', () => {
                const menu = document.getElementById('teacherSettingsMenu');
                if (menu) menu.classList.add('hidden');
                this.goalsEditorModal.classList.remove('hidden');
                this.goalsEditorModal.style.display = 'flex';
                this.loadGoalsSettingsEditor();
            });
        }
        if (this.closeGoalsEditorBtn && this.goalsEditorModal) {
            this.closeGoalsEditorBtn.addEventListener('click', () => {
                this.goalsEditorModal.classList.add('hidden');
                this.goalsEditorModal.style.display = 'none';
            });
        }
        if (this.goalsEditorModal) {
            this.goalsEditorModal.addEventListener('click', (e) => {
                if (e.target === this.goalsEditorModal) {
                    this.goalsEditorModal.classList.add('hidden');
                    this.goalsEditorModal.style.display = 'none';
                }
            });
        }

        // Goals settings listeners
        this.setupGoalsSettingsEventListeners();

        // Group creation
        if (this.createGroupBtn) {
            this.createGroupBtn.addEventListener('click', () => {
                this.openGroupModal();
            });
        }
        if (this.closeGroupModalBtn) {
            this.closeGroupModalBtn.addEventListener('click', () => {
                this.closeGroupModal();
            });
        }
        if (this.saveGroupBtn) {
            this.saveGroupBtn.addEventListener('click', () => {
                this.handleSaveGroup();
            });
        }

        // Booking Type Switcher (Radio buttons)
        const bookingTypeRadios = document.getElementsByName('bookingType');
        bookingTypeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                const val = document.querySelector('input[name="bookingType"]:checked').value;
                if (val === 'group') {
                    this.bookingStudentContainer.style.display = 'none';
                    this.bookingGroupContainer.style.display = 'block';
                } else {
                    this.bookingStudentContainer.style.display = 'block';
                    this.bookingGroupContainer.style.display = 'none';
                }
            });
        });

        // Group Deletion Modal buttons
        if (this.deleteGroupOccurrenceBtn) {
            this.deleteGroupOccurrenceBtn.addEventListener('click', () => {
                this.executeGroupLessonDeletion('everyone');
            });
        }
        if (this.deleteGroupSeriesBtn) {
            this.deleteGroupSeriesBtn.addEventListener('click', () => {
                this.executeGroupLessonDeletion('series');
            });
        }
        if (this.cancelDeleteGroupOptionsBtn) {
            this.cancelDeleteGroupOptionsBtn.addEventListener('click', () => {
                this.closeDeleteGroupOptionsModal();
            });
        }

        // Cancel deletion options modal
        if (this.cancelDeleteOptionsBtn) {
            this.cancelDeleteOptionsBtn.addEventListener('click', () => {
                this.closeDeleteOptionsModal();
            });
        }

        // Deletion actions
        if (this.deleteOccurrenceBtn) {
            this.deleteOccurrenceBtn.addEventListener('click', () => {
                this.executeSeriesDeletion('single');
            });
        }
        if (this.deleteFutureBtn) {
            this.deleteFutureBtn.addEventListener('click', () => {
                this.executeSeriesDeletion('future');
            });
        }
        if (this.deleteSeriesBtn) {
            this.deleteSeriesBtn.addEventListener('click', () => {
                this.executeSeriesDeletion('all');
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

            // Load all student progress for this teacher and listen in real-time
            this.allProgress = {};
            this.firebaseManager.database.ref(`studentProgress/${user.uid}`).on('value', (snapshot) => {
                this.allProgress = snapshot.val() || {};
                this.groups = this.allProgress.groups || {};
                this.teacherSettings = this.allProgress.settings || { defaultGoals: null, customGoalSets: {} };
                this.extractLessons();
                this.renderCalendar();
                this.renderGroups();
                this.populateGroupDropdown();

                // Only initialize editor data once, or when saved, to avoid losing unsaved changes
                if (!this.goalsEditorInitialized) {
                    this.goalsEditorInitialized = true;
                    this.loadGoalsSettingsEditor();
                } else {
                    this.populateGoalsSetDropdown();
                }
            });

            // Load Students
            const result = await this.firebaseManager.getConnectedStudents();
            if (result.success) {
                this.students = result.students || [];
                this.renderStudents(this.students);
                this.populateStudentDropdown();
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

            const card = document.createElement('div');
            card.className = 'student-card';
            card.dataset.uid = student.uid;
            card.style.cursor = 'pointer';
            card.innerHTML = `
                <div class="student-email" style="font-weight: 600; color: #334155; margin-bottom: 5px; font-size: 14px;">${student.email}</div>
                <div class="student-meta" style="color: #64748b; font-size: 11px; margin-bottom: 10px; display: flex; flex-direction: column; gap: 4px;">
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

    // --- Calendar Methods ---

    extractLessons() {
        this.lessonsByDate = {};
        Object.entries(this.allProgress).forEach(([studentUid, progress]) => {
            if (studentUid === 'groups' || studentUid === 'settings') return;
            if (progress.lessons) {
                Object.entries(progress.lessons).forEach(([lessonId, lesson]) => {
                    const date = lesson.date;
                    if (!this.lessonsByDate[date]) {
                        this.lessonsByDate[date] = [];
                    }
                    this.lessonsByDate[date].push({
                        id: lessonId,
                        studentUid: studentUid,
                        ...lesson
                    });
                });
            }
        });
        
        // Sort lessons on each day chronologically by time
        Object.keys(this.lessonsByDate).forEach(date => {
            this.lessonsByDate[date].sort((a, b) => a.time.localeCompare(b.time));
        });
    }

    renderCalendar() {
        if (!this.calendarGrid) return;
        
        const year = this.currentCalendarDate.getFullYear();
        const month = this.currentCalendarDate.getMonth();
        
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        this.currentMonthYearSpan.textContent = `${monthNames[month]} ${year}`;
        
        this.calendarGrid.innerHTML = '';
        
        // Render Day Headers
        const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        dayNames.forEach(name => {
            const header = document.createElement('div');
            header.className = 'calendar-day-header';
            header.textContent = name;
            this.calendarGrid.appendChild(header);
        });
        
        // Render Calendar Days
        const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
        let firstDayAdjusted = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
        
        const totalDays = new Date(year, month + 1, 0).getDate();
        const prevMonthTotalDays = new Date(year, month, 0).getDate();
        
        // Fill previous month padding days
        for (let i = firstDayAdjusted; i > 0; i--) {
            const dayNum = prevMonthTotalDays - i + 1;
            const prevMonthDate = new Date(year, month - 1, dayNum);
            this.renderDayCell(prevMonthDate, true);
        }
        
        // Fill current month days
        for (let i = 1; i <= totalDays; i++) {
            const currentMonthDate = new Date(year, month, i);
            this.renderDayCell(currentMonthDate, false);
        }
        
        // Fill next month padding days
        const totalCellsSoFar = firstDayAdjusted + totalDays;
        const remainingCells = (7 - (totalCellsSoFar % 7)) % 7;
        for (let i = 1; i <= remainingCells; i++) {
            const nextMonthDate = new Date(year, month + 1, i);
            this.renderDayCell(nextMonthDate, true);
        }

        this.updateSelectedDayPanel();
    }

    renderDayCell(date, isOtherMonth) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const dayNum = date.getDate();
        const dateStr = `${year}-${month}-${String(dayNum).padStart(2, '0')}`;
        
        const cell = document.createElement('div');
        cell.className = 'calendar-day-cell';
        if (isOtherMonth) cell.classList.add('other-month');
        
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const isToday = dateStr === todayStr;
        if (isToday) cell.classList.add('today');
        
        const selectedStr = `${this.selectedCalendarDate.getFullYear()}-${String(this.selectedCalendarDate.getMonth() + 1).padStart(2, '0')}-${String(this.selectedCalendarDate.getDate()).padStart(2, '0')}`;
        const isSelected = dateStr === selectedStr;
        if (isSelected) cell.classList.add('selected');
        
        const numberLabel = document.createElement('div');
        numberLabel.className = 'day-number';
        if (isToday) numberLabel.classList.add('today-num');
        numberLabel.textContent = dayNum;
        cell.appendChild(numberLabel);
        
        const dayLessons = this.lessonsByDate[dateStr] || [];
        
        // Desktop Container
        const pillsContainer = document.createElement('div');
        pillsContainer.className = 'day-lessons-container';
        
        // Mobile Container
        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'day-lessons-dot-container';
        
        const renderedGroups = new Set();
        dayLessons.forEach(lesson => {
            if (lesson.groupLessonId) {
                if (renderedGroups.has(lesson.groupLessonId)) return;
                renderedGroups.add(lesson.groupLessonId);
            }
            
            const pill = document.createElement('div');
            pill.className = 'calendar-lesson-pill';
            
            if (lesson.groupLessonId && lesson.groupName) {
                const groupNameDisplay = lesson.groupName.length > 20 ? lesson.groupName.substring(0, 17) + '...' : lesson.groupName;
                pill.textContent = `${lesson.time} [${groupNameDisplay}]`;
                pill.title = `${lesson.time} - Group: ${lesson.groupName}`;
                pill.style.background = '#f0fdf4';
                pill.style.borderColor = '#bbf7d0';
                pill.style.color = '#166534';
            } else {
                const studentName = lesson.studentEmail ? lesson.studentEmail.split('@')[0] : 'Student';
                pill.textContent = `${lesson.time} ${studentName}`;
                pill.title = `${lesson.time} - ${lesson.studentEmail}`;
            }
            
            pillsContainer.appendChild(pill);
            
            const dot = document.createElement('div');
            dot.className = 'day-lesson-dot';
            if (lesson.groupLessonId) {
                dot.style.background = '#16a34a';
            }
            dotsContainer.appendChild(dot);
        });
        
        cell.appendChild(pillsContainer);
        cell.appendChild(dotsContainer);
        
        cell.addEventListener('click', () => {
            this.selectedCalendarDate = new Date(date);
            this.renderCalendar();
        });
        
        this.calendarGrid.appendChild(cell);
    }

    updateSelectedDayPanel() {
        if (!this.selectedDayPanel) return;
        
        const date = this.selectedCalendarDate;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        this.selectedDayLabel.textContent = date.toLocaleDateString('en-US', options);
        
        const dayLessons = this.lessonsByDate[dateStr] || [];
        this.dayLessonsList.innerHTML = '';
        
        if (dayLessons.length === 0) {
            this.dayLessonsList.innerHTML = '<div style="color: #64748b; font-size: 13px; padding: 10px 0;">No lessons scheduled for this day.</div>';
        } else {
            const renderedGroups = new Set();
            dayLessons.forEach(lesson => {
                if (lesson.groupLessonId) {
                    if (renderedGroups.has(lesson.groupLessonId)) return;
                    renderedGroups.add(lesson.groupLessonId);
                }
                
                const item = document.createElement('div');
                item.style.cssText = `
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 10px 14px;
                `;
                
                const recurrenceLabels = {
                    'none': '',
                    'weekly': 'Weekly',
                    '2weekly': 'Every 2 Weeks',
                    'monthly': 'Monthly'
                };
                const recText = (lesson.recurrence && lesson.recurrence !== 'none') ? ` (${recurrenceLabels[lesson.recurrence] || lesson.recurrence})` : '';
                const displayLabel = lesson.groupLessonId ? `👥 Group: ${lesson.groupName}` : `👤 ${lesson.studentEmail}`;
                
                item.innerHTML = `
                    <div>
                        <div style="font-weight: 600; color: #1e293b; font-size: 14px;">⏰ ${lesson.time}</div>
                        <div style="font-size: 12px; color: #64748b; margin-top: 2px;">${displayLabel}${recText}</div>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button type="button" class="btn-edit-lesson" style="background: none; border: none; font-size: 16px; cursor: pointer; color: #64748b; padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center; transition: color 0.2s, background 0.2s;" title="Edit Lesson">✏️</button>
                        <button type="button" class="btn-cancel-lesson" style="background: none; border: none; font-size: 16px; cursor: pointer; color: #64748b; padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center; transition: color 0.2s, background 0.2s;" title="Cancel Lesson">❌</button>
                    </div>
                `;
                
                const editBtn = item.querySelector('.btn-edit-lesson');
                editBtn.addEventListener('mouseover', () => {
                    editBtn.style.color = '#0284c7';
                    editBtn.style.background = '#f0f9ff';
                });
                editBtn.addEventListener('mouseout', () => {
                    editBtn.style.color = '#64748b';
                    editBtn.style.background = 'none';
                });
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.openBookingModal(lesson);
                });

                const deleteBtn = item.querySelector('.btn-cancel-lesson');
                deleteBtn.addEventListener('mouseover', () => {
                    deleteBtn.style.color = '#ef4444';
                    deleteBtn.style.background = '#fef2f2';
                });
                deleteBtn.addEventListener('mouseout', () => {
                    deleteBtn.style.color = '#64748b';
                    deleteBtn.style.background = 'none';
                });
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.confirmCancelLesson(lesson);
                });
                
                this.dayLessonsList.appendChild(item);
            });
        }
        
        this.selectedDayPanel.style.display = 'block';
    }

    populateStudentDropdown() {
        if (!this.bookingStudentSelect) return;
        
        const currentVal = this.bookingStudentSelect.value;
        this.bookingStudentSelect.innerHTML = '<option value="">-- Select Student --</option>';
        
        this.students.forEach(student => {
            const option = document.createElement('option');
            option.value = student.uid;
            option.textContent = student.email;
            this.bookingStudentSelect.appendChild(option);
        });
        
        if (currentVal) {
            this.bookingStudentSelect.value = currentVal;
        }
    }

    populateTimeDropdown() {
        if (!this.bookingTimeInput) return;
        this.bookingTimeInput.innerHTML = '';
        for (let hour = 6; hour <= 23; hour++) {
            const maxMin = (hour === 23) ? 0 : 55;
            for (let min = 0; min <= maxMin; min += 5) {
                const hh = String(hour).padStart(2, '0');
                const mm = String(min).padStart(2, '0');
                const val = `${hh}:${mm}`;
                const opt = document.createElement('option');
                opt.value = val;
                opt.textContent = val;
                this.bookingTimeInput.appendChild(opt);
            }
        }
    }

    openBookingModal(lesson = null) {
        if (!this.bookingModal) return;
        
        // Reset disabled states for creating
        this.bookingStudentSelect.disabled = false;
        this.bookingGroupSelect.disabled = false;
        this.bookingRecurrenceSelect.disabled = false;
        this.bookingDurationSelect.disabled = false;
        document.querySelectorAll('input[name="bookingType"]').forEach(r => r.disabled = false);
        
        if (lesson) {
            // Edit Mode
            this.editingLesson = lesson;
            const titleEl = document.getElementById('bookingModalTitle');
            if (titleEl) titleEl.textContent = 'Edit Lesson';
            if (this.saveBookingBtn) this.saveBookingBtn.textContent = 'Save Changes';
            
            this.bookingDateInput.value = lesson.date;
            
            // Safe select setter for time
            let timeFound = false;
            for (let i = 0; i < this.bookingTimeInput.options.length; i++) {
                if (this.bookingTimeInput.options[i].value === lesson.time) {
                    timeFound = true;
                    break;
                }
            }
            if (!timeFound) {
                const opt = document.createElement('option');
                opt.value = lesson.time;
                opt.textContent = lesson.time;
                this.bookingTimeInput.appendChild(opt);
            }
            this.bookingTimeInput.value = lesson.time;
            
            // Set booking type
            const isGroup = !!lesson.groupLessonId;
            document.querySelectorAll('input[name="bookingType"]').forEach(r => {
                r.checked = (r.value === (isGroup ? 'group' : 'individual'));
                r.disabled = true; // disable changing type during edit
            });
            
            if (isGroup) {
                this.bookingStudentContainer.style.display = 'none';
                this.bookingGroupContainer.style.display = 'block';
                
                // Find group ID matching groupName
                let matchedGroupId = '';
                if (this.groups) {
                    const found = Object.values(this.groups).find(g => g.name === lesson.groupName);
                    if (found) matchedGroupId = found.id;
                }
                this.bookingGroupSelect.value = matchedGroupId;
                this.bookingGroupSelect.disabled = true;
            } else {
                this.bookingStudentContainer.style.display = 'block';
                this.bookingGroupContainer.style.display = 'none';
                this.bookingStudentSelect.value = lesson.studentUid;
                this.bookingStudentSelect.disabled = true;
            }
            
            this.bookingRecurrenceSelect.value = lesson.recurrence || 'none';
            this.bookingRecurrenceSelect.disabled = true;
            this.bookingDurationSelect.disabled = true;
            this.recurrenceDurationSection.style.display = (lesson.recurrence && lesson.recurrence !== 'none') ? 'block' : 'none';
        } else {
            // Create Mode
            this.editingLesson = null;
            const titleEl = document.getElementById('bookingModalTitle');
            if (titleEl) titleEl.textContent = 'Book a Lesson';
            if (this.saveBookingBtn) this.saveBookingBtn.textContent = 'Book Lesson';
            
            const date = this.selectedCalendarDate;
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            
            this.bookingDateInput.value = dateStr;
            this.bookingTimeInput.value = "12:00";
            this.bookingRecurrenceSelect.value = "none";
            this.recurrenceDurationSection.style.display = 'none';
            
            // Reset Booking Type toggle to individual
            const typeInd = document.querySelector('input[name="bookingType"][value="individual"]');
            if (typeInd) {
                typeInd.checked = true;
                this.bookingStudentContainer.style.display = 'block';
                this.bookingGroupContainer.style.display = 'none';
            }
        }
        
        this.bookingModal.classList.remove('hidden');
        this.bookingModal.style.display = 'flex';
    }
    
    closeBookingModal() {
        if (!this.bookingModal) return;
        this.bookingModal.classList.add('hidden');
        this.bookingModal.style.display = 'none';
        this.editingLesson = null;
    }

    async handleSaveBooking() {
        const bookingType = document.querySelector('input[name="bookingType"]:checked').value;
        const time = this.bookingTimeInput.value;
        const dateVal = this.bookingDateInput.value;
        const recurrence = this.bookingRecurrenceSelect.value;
        const duration = this.bookingDurationSelect.value;
        
        if (!time) {
            alert('Please select a time.');
            return;
        }
        if (!dateVal) {
            alert('Please select a date.');
            return;
        }
        
        if (this.editingLesson) {
            this.saveBookingBtn.disabled = true;
            this.saveBookingBtn.textContent = 'Saving...';
            try {
                const teacherUid = this.firebaseManager.currentUser.uid;
                const updates = {};
                
                if (this.editingLesson.groupLessonId) {
                    // Update date and time for all students sharing this groupLessonId and original date/time
                    const originalDate = this.editingLesson.date;
                    const originalTime = this.editingLesson.time;
                    
                    Object.entries(this.allProgress).forEach(([studentUid, progress]) => {
                        if (studentUid === 'groups' || studentUid === 'settings') return;
                        if (progress.lessons) {
                            Object.entries(progress.lessons).forEach(([id, l]) => {
                                if (l.groupLessonId === this.editingLesson.groupLessonId && l.date === originalDate && l.time === originalTime) {
                                    updates[`studentProgress/${teacherUid}/${studentUid}/lessons/${id}/date`] = dateVal;
                                    updates[`studentProgress/${teacherUid}/${studentUid}/lessons/${id}/time`] = time;
                                }
                            });
                        }
                    });
                } else {
                    // Update only this single lesson
                    updates[`studentProgress/${teacherUid}/${this.editingLesson.studentUid}/lessons/${this.editingLesson.id}/date`] = dateVal;
                    updates[`studentProgress/${teacherUid}/${this.editingLesson.studentUid}/lessons/${this.editingLesson.id}/time`] = time;
                }
                
                await this.firebaseManager.database.ref().update(updates);
                this.closeBookingModal();
            } catch (e) {
                console.error('Update booking failed:', e);
                alert('Failed to update booking: ' + e.message);
            } finally {
                this.saveBookingBtn.disabled = false;
                this.saveBookingBtn.textContent = 'Save Changes';
            }
            return;
        }
        
        let studentsToBook = []; // array of { uid, email }
        let groupName = null;
        let groupLessonId = null;
        
        if (bookingType === 'group') {
            const groupId = this.bookingGroupSelect.value;
            if (!groupId) {
                alert('Please select a group.');
                return;
            }
            const group = this.groups[groupId];
            if (!group || !group.studentUids || group.studentUids.length === 0) {
                alert('Selected group has no students.');
                return;
            }
            groupName = group.name;
            groupLessonId = 'grouplesson_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            group.studentUids.forEach(uid => {
                const s = this.students.find(student => student.uid === uid);
                studentsToBook.push({
                    uid: uid,
                    email: s ? s.email : 'Unknown'
                });
            });
        } else {
            const studentUid = this.bookingStudentSelect.value;
            if (!studentUid) {
                alert('Please select a student.');
                return;
            }
            const s = this.students.find(student => student.uid === studentUid);
            studentsToBook.push({
                uid: studentUid,
                email: s ? s.email : 'Unknown'
            });
        }
        
        this.saveBookingBtn.disabled = true;
        this.saveBookingBtn.textContent = 'Booking...';
        
        try {
            const startDate = new Date(dateVal + 'T00:00:00');
            let endDate = new Date(startDate);
            if (recurrence !== 'none') {
                if (duration === '3months') {
                    endDate.setMonth(endDate.getMonth() + 3);
                } else if (duration === '6months') {
                    endDate.setMonth(endDate.getMonth() + 6);
                } else if (duration === '1year') {
                    endDate.setMonth(endDate.getMonth() + 12);
                }
            }
            
            const lessonsToCreate = [];
            const seriesId = recurrence !== 'none' ? 'series_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9) : null;
            
            let loopDate = new Date(startDate);
            if (recurrence === 'none') {
                lessonsToCreate.push(new Date(loopDate));
            } else {
                while (loopDate <= endDate) {
                    lessonsToCreate.push(new Date(loopDate));
                    
                    if (recurrence === 'weekly') {
                        loopDate.setDate(loopDate.getDate() + 7);
                    } else if (recurrence === '2weekly') {
                        loopDate.setDate(loopDate.getDate() + 14);
                    } else if (recurrence === 'monthly') {
                        loopDate.setMonth(loopDate.getMonth() + 1);
                    }
                }
            }
            
            if (lessonsToCreate.length * studentsToBook.length > 150) {
                throw new Error('Too many lesson slots generated. Max is 150.');
            }
            
            const updates = {};
            const teacherUid = this.firebaseManager.currentUser.uid;
            
            studentsToBook.forEach(sInfo => {
                const studentUid = sInfo.uid;
                const studentEmail = sInfo.email;
                
                lessonsToCreate.forEach(dateObj => {
                    const year = dateObj.getFullYear();
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const day = String(dateObj.getDate()).padStart(2, '0');
                    const dateStr = `${year}-${month}-${day}`;
                    
                    const lessonId = 'lesson_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    
                    updates[`studentProgress/${teacherUid}/${studentUid}/lessons/${lessonId}`] = {
                        id: lessonId,
                        studentUid: studentUid,
                        studentEmail: studentEmail,
                        date: dateStr,
                        time: time,
                        recurrence: recurrence,
                        duration: recurrence !== 'none' ? duration : 'none',
                        seriesId: seriesId,
                        groupLessonId: groupLessonId,
                        groupName: groupName
                    };
                });
            });
            
            await this.firebaseManager.database.ref().update(updates);
            this.closeBookingModal();
        } catch (e) {
            console.error('Booking failed:', e);
            alert('Failed to book lesson: ' + e.message);
        } finally {
            this.saveBookingBtn.disabled = false;
            this.saveBookingBtn.textContent = 'Book Lesson';
        }
    }

    confirmCancelLesson(lesson) {
        this.activeDeleteLesson = lesson;
        
        if (lesson.groupLessonId) {
            if (this.deleteGroupOptionsModal) {
                this.deleteGroupOptionsModal.classList.remove('hidden');
                this.deleteGroupOptionsModal.style.display = 'flex';
            }
        } else if (!lesson.seriesId) {
            if (confirm(`Are you sure you want to cancel the lesson for ${lesson.studentEmail} on ${lesson.date} at ${lesson.time}?`)) {
                this.executeLessonDeletion(lesson.id, lesson.studentUid);
            }
        } else {
            if (this.deleteOptionsModal) {
                this.deleteOptionsModal.classList.remove('hidden');
                this.deleteOptionsModal.style.display = 'flex';
            }
        }
    }

    async executeSeriesDeletion(type) {
        if (!this.activeDeleteLesson) return;
        
        const lesson = this.activeDeleteLesson;
        const studentUid = lesson.studentUid;
        const seriesId = lesson.seriesId;
        const teacherUid = this.firebaseManager.currentUser.uid;
        
        this.closeDeleteOptionsModal();
        
        try {
            const snapshot = await this.firebaseManager.database.ref(`studentProgress/${teacherUid}/${studentUid}/lessons`).once('value');
            const studentLessons = snapshot.val() || {};
            
            const updates = {};
            
            Object.entries(studentLessons).forEach(([id, l]) => {
                if (type === 'single' && id === lesson.id) {
                    updates[`studentProgress/${teacherUid}/${studentUid}/lessons/${id}`] = null;
                } else if (l.seriesId === seriesId) {
                    if (type === 'all') {
                        updates[`studentProgress/${teacherUid}/${studentUid}/lessons/${id}`] = null;
                    } else if (type === 'future') {
                        if (l.date >= lesson.date) {
                            updates[`studentProgress/${teacherUid}/${studentUid}/lessons/${id}`] = null;
                        }
                    }
                }
            });
            
            await this.firebaseManager.database.ref().update(updates);
        } catch (e) {
            console.error('Deletion failed:', e);
            alert('Failed to cancel lessons: ' + e.message);
        }
    }

    async executeLessonDeletion(lessonId, studentUid) {
        const teacherUid = this.firebaseManager.currentUser.uid;
        try {
            await this.firebaseManager.database.ref(`studentProgress/${teacherUid}/${studentUid}/lessons/${lessonId}`).remove();
        } catch (e) {
            console.error('Single lesson deletion failed:', e);
            alert('Failed to cancel lesson: ' + e.message);
        }
    }

    closeDeleteOptionsModal() {
        if (this.deleteOptionsModal) {
            this.deleteOptionsModal.classList.add('hidden');
            this.deleteOptionsModal.style.display = 'none';
        }
        this.activeDeleteLesson = null;
    }

    // --- Groups Management Methods ---

    switchTab(tab) {
        // Reset all tab button styles
        [this.tabStudentsBtn, this.tabGroupsBtn].forEach(btn => {
            if (btn) {
                btn.classList.remove('active');
                btn.style.color = '#64748b';
                btn.style.borderBottom = '2px solid transparent';
            }
        });
        
        // Hide all tab contents
        if (this.tabStudentsContent) this.tabStudentsContent.style.display = 'none';
        if (this.tabGroupsContent) this.tabGroupsContent.style.display = 'none';
        
        // Show active tab and set active button style
        if (tab === 'students') {
            if (this.tabStudentsBtn) {
                this.tabStudentsBtn.classList.add('active');
                this.tabStudentsBtn.style.color = '#166534';
                this.tabStudentsBtn.style.borderBottom = '2px solid #166534';
            }
            if (this.tabStudentsContent) this.tabStudentsContent.style.display = 'flex';
        } else if (tab === 'groups') {
            if (this.tabGroupsBtn) {
                this.tabGroupsBtn.classList.add('active');
                this.tabGroupsBtn.style.color = '#166534';
                this.tabGroupsBtn.style.borderBottom = '2px solid #166534';
            }
            if (this.tabGroupsContent) this.tabGroupsContent.style.display = 'flex';
        }
    }

    openGroupModal(group = null) {
        if (!this.groupModal) return;
        
        const errorEl = document.getElementById('groupFormError');
        if (errorEl) errorEl.style.display = 'none';
        
        this.groupNameInput.value = group ? group.name : '';
        this.editGroupId.value = group ? group.id : '';
        document.getElementById('groupModalTitle').textContent = group ? 'Edit Group' : 'Create Group';
        
        // Populate Student Checklist
        this.groupStudentChecklist.innerHTML = '';
        if (this.students.length === 0) {
            this.groupStudentChecklist.innerHTML = '<div style="color: #64748b; font-size: 13px; text-align: center; padding: 10px 0;">No connected students found.</div>';
        } else {
            this.students.forEach(student => {
                const isChecked = group && group.studentUids && group.studentUids.includes(student.uid);
                const label = document.createElement('label');
                label.style.cssText = 'display: flex; align-items: center; gap: 8px; font-size: 13px; color: #334155; cursor: pointer; padding: 4px 0;';
                label.innerHTML = `
                    <input type="checkbox" value="${student.uid}" ${isChecked ? 'checked' : ''} style="cursor: pointer;">
                    <span>${student.email}</span>
                `;
                this.groupStudentChecklist.appendChild(label);
            });
        }
        
        this.groupModal.classList.remove('hidden');
        this.groupModal.style.display = 'flex';
    }

    closeGroupModal() {
        if (!this.groupModal) return;
        this.groupModal.classList.add('hidden');
        this.groupModal.style.display = 'none';
    }

    async handleSaveGroup() {
        const name = this.groupNameInput.value.trim();
        const editId = this.editGroupId.value;
        const errorEl = document.getElementById('groupFormError');
        if (errorEl) errorEl.style.display = 'none';
        
        if (!name) {
            if (errorEl) {
                errorEl.textContent = 'Please enter a group name.';
                errorEl.style.display = 'block';
            } else {
                alert('Please enter a group name.');
            }
            return;
        }
        
        const checkedInputs = this.groupStudentChecklist.querySelectorAll('input[type="checkbox"]:checked');
        const studentUids = Array.from(checkedInputs).map(input => input.value);
        
        if (studentUids.length === 0) {
            if (errorEl) {
                errorEl.textContent = 'Please select at least one student.';
                errorEl.style.display = 'block';
            } else {
                alert('Please select at least one student.');
            }
            return;
        }
        
        this.saveGroupBtn.disabled = true;
        this.saveGroupBtn.textContent = 'Saving...';
        
        try {
            const groupId = editId || 'group_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            const teacherUid = this.firebaseManager.currentUser.uid;
            
            await this.firebaseManager.database.ref(`studentProgress/${teacherUid}/groups/${groupId}`).set({
                id: groupId,
                name: name,
                studentUids: studentUids
            });
            
            this.closeGroupModal();
        } catch (e) {
            console.error('Group save failed:', e);
            alert('Failed to save group: ' + e.message);
        } finally {
            this.saveGroupBtn.disabled = false;
            this.saveGroupBtn.textContent = 'Save Group';
        }
    }

    renderGroups() {
        if (!this.groupsGrid) return;
        
        const groupList = Object.values(this.groups);
        this.groupCountBadge.textContent = groupList.length;
        this.groupsGrid.innerHTML = '';
        
        if (groupList.length === 0) {
            this.groupsGrid.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 30px; color: #64748b;">
                    <div class="empty-state-icon" style="font-size: 32px; margin-bottom: 10px;">👥</div>
                    <p>No groups created yet.</p>
                </div>
            `;
            return;
        }
        
        groupList.forEach(group => {
            const card = document.createElement('div');
            card.className = 'group-card';
            
            // Map student UIDs to emails
            const emails = (group.studentUids || []).map(uid => {
                const student = this.students.find(s => s.uid === uid);
                return student ? student.email.split('@')[0] : 'Unknown';
            }).join(', ');
            
            card.innerHTML = `
                <div style="min-width: 0; flex: 1;">
                    <div style="font-weight: 700; color: #1e293b; font-size: 14px;">${group.name}</div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${emails}">
                        👤 ${emails}
                    </div>
                </div>
                <div style="display: flex; gap: 8px; flex-shrink: 0;">
                    <button class="btn-edit-group" style="background: none; border: none; cursor: pointer; font-size: 14px; padding: 4px;" title="Edit Group">✏️</button>
                    <button class="btn-delete-group" style="background: none; border: none; cursor: pointer; font-size: 14px; padding: 4px;" title="Delete Group">🗑️</button>
                </div>
            `;
            
            card.querySelector('.btn-edit-group').addEventListener('click', (e) => {
                e.stopPropagation();
                this.openGroupModal(group);
            });
            
            card.querySelector('.btn-delete-group').addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm(`Are you sure you want to delete the group "${group.name}"?`)) {
                    try {
                        const teacherUid = this.firebaseManager.currentUser.uid;
                        await this.firebaseManager.database.ref(`studentProgress/${teacherUid}/groups/${group.id}`).remove();
                    } catch (e) {
                        alert('Failed to delete group: ' + e.message);
                    }
                }
            });
            
            this.groupsGrid.appendChild(card);
        });
    }

    populateGroupDropdown() {
        if (!this.bookingGroupSelect) return;
        
        const currentVal = this.bookingGroupSelect.value;
        this.bookingGroupSelect.innerHTML = '<option value="">-- Select Group --</option>';
        
        Object.values(this.groups).forEach(group => {
            const option = document.createElement('option');
            option.value = group.id;
            option.textContent = group.name;
            this.bookingGroupSelect.appendChild(option);
        });
        
        if (currentVal) {
            this.bookingGroupSelect.value = currentVal;
        }
    }

    async executeGroupLessonDeletion(type) {
        if (!this.activeDeleteLesson) return;
        
        const lesson = this.activeDeleteLesson;
        const teacherUid = this.firebaseManager.currentUser.uid;
        this.closeDeleteGroupOptionsModal();
        
        try {
            if (type === 'student_only') {
                // Delete only for this student
                await this.firebaseManager.database.ref(`studentProgress/${teacherUid}/${lesson.studentUid}/lessons/${lesson.id}`).remove();
            } else {
                // Fetch lessons of all students to find matches
                const snapshot = await this.firebaseManager.database.ref(`studentProgress/${teacherUid}`).once('value');
                const progressData = snapshot.val() || {};
                
                const updates = {};
                
                Object.entries(progressData).forEach(([studentUid, progress]) => {
                    if (studentUid === 'groups' || studentUid === 'settings') return;
                    if (progress.lessons) {
                        Object.entries(progress.lessons).forEach(([id, l]) => {
                            if (l.groupLessonId === lesson.groupLessonId) {
                                if (type === 'series') {
                                    // Delete all recurring group slots for everyone
                                    updates[`studentProgress/${teacherUid}/${studentUid}/lessons/${id}`] = null;
                                } else if (type === 'everyone' && l.date === lesson.date && l.time === lesson.time) {
                                    // Delete this specific slot occurrence for everyone
                                    updates[`studentProgress/${teacherUid}/${studentUid}/lessons/${id}`] = null;
                                }
                            }
                        });
                    }
                });
                
                await this.firebaseManager.database.ref().update(updates);
            }
        } catch (e) {
            console.error('Group cancellation failed:', e);
            alert('Failed to cancel group lessons: ' + e.message);
        }
    }

    closeDeleteGroupOptionsModal() {
        if (this.deleteGroupOptionsModal) {
            this.deleteGroupOptionsModal.classList.add('hidden');
            this.deleteGroupOptionsModal.style.display = 'none';
        }
        this.activeDeleteLesson = null;
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
        const teacherCode = (this.teacherCodeBox.textContent || '').trim();
        const teacherName = (this.teacherNameDisplay.textContent || '').trim();
        
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
`   ${teacherCode}\n\n` +
`To help you find it, you can view this screenshot instruction: https://www.popsongchordbook.com/images/connect_teacher_guide.png\n\n` +
`Looking forward to practicing together!\n\n` +
`Best regards,\n` +
`${teacherName}`
        );
        
        const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;
        
        // Open default mail client
        window.location.href = mailtoUrl;
        
        // Close modal
        this.closeAddStudentModal();
    }

    handleExportCalendar() {
        if (!this.allProgress) {
            alert('No student progress data loaded.');
            return;
        }

        // Collect all lessons
        const allLessons = [];
        Object.entries(this.allProgress).forEach(([studentUid, progress]) => {
            if (studentUid === 'groups' || studentUid === 'settings') return;
            if (progress.lessons) {
                Object.entries(progress.lessons).forEach(([lessonId, lesson]) => {
                    allLessons.push({
                        id: lessonId,
                        studentUid: studentUid,
                        ...lesson
                    });
                });
            }
        });

        if (allLessons.length === 0) {
            alert('No lessons scheduled to export.');
            return;
        }

        // Group group-lessons by groupLessonId + date + time, and keep individual lessons separate
        const exportedEvents = [];
        const groupLessonsMap = {}; // key -> array of lessons

        allLessons.forEach(lesson => {
            if (lesson.groupLessonId) {
                const key = `${lesson.groupLessonId}_${lesson.date}_${lesson.time}`;
                if (!groupLessonsMap[key]) {
                    groupLessonsMap[key] = [];
                }
                groupLessonsMap[key].push(lesson);
            } else {
                exportedEvents.push(lesson);
            }
        });

        // Add group lessons as single events
        Object.entries(groupLessonsMap).forEach(([key, lessons]) => {
            const first = lessons[0];
            const studentEmails = lessons.map(l => l.studentEmail).filter(Boolean);
            exportedEvents.push({
                ...first,
                isGroup: true,
                studentEmails: studentEmails
            });
        });

        // Helper to escape text fields
        const escapeText = (text) => {
            if (!text) return '';
            return text
                .replace(/\\/g, '\\\\')
                .replace(/;/g, '\\;')
                .replace(/,/g, '\\,')
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '');
        };

        // Helper to fold lines
        const foldLine = (line) => {
            if (line.length <= 75) return line;
            let result = '';
            let current = line;
            // First chunk can be up to 75 characters
            result += current.substring(0, 75);
            current = current.substring(75);
            // Subsequent chunks must have a leading space, so they can be up to 74 characters of data + 1 space
            while (current.length > 0) {
                result += '\r\n ' + current.substring(0, 74);
                current = current.substring(74);
            }
            return result;
        };

        // Build iCalendar
        const lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//PopSongChordBook//Lesson Calendar//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH'
        ];

        exportedEvents.forEach(evt => {
            // evt.date is YYYY-MM-DD
            // evt.time is HH:MM
            const dateParts = evt.date.split('-');
            const timeParts = evt.time.split(':');
            if (dateParts.length !== 3 || timeParts.length !== 2) return;

            const yearStr = dateParts[0];
            const monthStr = dateParts[1];
            const dayStr = dateParts[2];
            const hourStr = timeParts[0];
            const minStr = timeParts[1];

            // DTSTART format: YYYYMMDDTHHMMSS (local time format without Z, floating)
            const startDt = `${yearStr}${monthStr}${dayStr}T${hourStr}${minStr}00`;

            // Calculate end time (1 hour duration)
            const year = parseInt(yearStr, 10);
            const month = parseInt(monthStr, 10);
            const day = parseInt(dayStr, 10);
            const hour = parseInt(hourStr, 10);
            const min = parseInt(minStr, 10);
            const startDate = new Date(year, month - 1, day, hour, min, 0);
            const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Add 1 hour

            const endYear = endDate.getFullYear();
            const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
            const endDay = String(endDate.getDate()).padStart(2, '0');
            const endHour = String(endDate.getHours()).padStart(2, '0');
            const endMin = String(endDate.getMinutes()).padStart(2, '0');
            const endDt = `${endYear}${endMonth}${endDay}T${endHour}${endMin}00`;

            // DTSTAMP - UTC current time
            const now = new Date();
            const nowYear = now.getUTCFullYear();
            const nowMonth = String(now.getUTCMonth() + 1).padStart(2, '0');
            const nowDay = String(now.getUTCDate()).padStart(2, '0');
            const nowHour = String(now.getUTCHours()).padStart(2, '0');
            const nowMin = String(now.getUTCMinutes()).padStart(2, '0');
            const nowSec = String(now.getUTCSeconds()).padStart(2, '0');
            const dtStamp = `${nowYear}${nowMonth}${nowDay}T${nowHour}${nowMin}${nowSec}Z`;

            let summary = '';
            let description = '';

            if (evt.isGroup) {
                summary = `Group Lesson - ${evt.groupName || 'Music Lesson'}`;
                description = `Group Lesson: ${evt.groupName || ''}\n\nConnected Students:\n` + 
                              evt.studentEmails.map(email => `- ${email}`).join('\n');
            } else {
                const studentName = evt.studentEmail ? evt.studentEmail.split('@')[0] : 'Student';
                summary = `Lesson with ${studentName}`;
                description = `Individual Lesson\nStudent Email: ${evt.studentEmail || 'N/A'}`;
            }

            const uid = `lesson_${evt.id || Math.random().toString(36).substr(2, 9)}@popsongchordbook.com`;

            lines.push('BEGIN:VEVENT');
            lines.push(foldLine(`UID:${uid}`));
            lines.push(foldLine(`DTSTAMP:${dtStamp}`));
            lines.push(foldLine(`DTSTART:${startDt}`));
            lines.push(foldLine(`DTEND:${endDt}`));
            lines.push(foldLine(`SUMMARY:${escapeText(summary)}`));
            lines.push(foldLine(`DESCRIPTION:${escapeText(description)}`));
            lines.push('END:VEVENT');
        });

        lines.push('END:VCALENDAR');

        const icsContent = lines.join('\r\n');

        try {
            const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'lessons_calendar.ics');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to export calendar:', err);
            alert('Failed to export calendar. Please try again.');
        }
    }

    // --- Goals Settings Editor Methods ---

    loadGoalsSettingsEditor() {
        this.populateGoalsSetDropdown();
        this.loadActiveSetGoals();
    }

    populateGoalsSetDropdown() {
        if (!this.goalsSetSelect) return;
        
        const currentVal = this.goalsSetSelect.value || this.activeGoalsSetType;
        this.goalsSetSelect.innerHTML = '<option value="default">Default Goals (for new students)</option>';
        
        const customSets = this.teacherSettings.customGoalSets || {};
        Object.keys(customSets).forEach(setId => {
            const set = customSets[setId];
            if (set && set.name) {
                const opt = document.createElement('option');
                opt.value = `custom_${setId}`;
                opt.textContent = `[Custom] ${set.name}`;
                this.goalsSetSelect.appendChild(opt);
            }
        });
        
        // Restore selection
        if ([...this.goalsSetSelect.options].some(opt => opt.value === currentVal)) {
            this.goalsSetSelect.value = currentVal;
            this.activeGoalsSetType = currentVal;
        } else {
            this.goalsSetSelect.value = 'default';
            this.activeGoalsSetType = 'default';
        }

        // Show/hide delete button based on selection
        if (this.deleteGoalSetBtn) {
            if (this.activeGoalsSetType === 'default') {
                this.deleteGoalSetBtn.classList.add('hidden');
                this.deleteGoalSetBtn.style.display = 'none';
            } else {
                this.deleteGoalSetBtn.classList.remove('hidden');
                this.deleteGoalSetBtn.style.display = 'block';
            }
        }
    }

    loadActiveSetGoals() {
        const systemDefaultGoals = [
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

        if (this.activeGoalsSetType === 'default') {
            this.editingGoalsList = JSON.parse(JSON.stringify(this.teacherSettings.defaultGoals || systemDefaultGoals));
        } else {
            const setId = this.activeGoalsSetType.replace('custom_', '');
            const customSets = this.teacherSettings.customGoalSets || {};
            const set = customSets[setId];
            this.editingGoalsList = JSON.parse(JSON.stringify((set && set.goals) ? set.goals : []));
        }

        this.renderActiveGoalsList();
    }

    renderActiveGoalsList() {
        if (!this.goalsListContainer) return;
        
        this.goalsListContainer.innerHTML = '';
        const count = this.editingGoalsList.length;
        if (this.goalsCountLabel) {
            this.goalsCountLabel.textContent = `${count} goal${count !== 1 ? 's' : ''}`;
        }
        
        if (count === 0) {
            this.goalsListContainer.innerHTML = '<div style="color: #64748b; font-size: 13px; text-align: center; padding: 25px;">No goals in this set yet. Add one below!</div>';
            return;
        }
        
        this.editingGoalsList.forEach((goal, idx) => {
            const row = document.createElement('div');
            row.draggable = true;
            row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid #e2e8f0; background: white; cursor: grab; transition: background 0.15s;';
            row.setAttribute('data-index', idx);
            if (idx === count - 1) row.style.borderBottom = 'none';
            
            // Drag and Drop Event Listeners
            row.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', idx);
                row.style.opacity = '0.5';
                row.style.background = '#f1f5f9';
            });
            
            row.addEventListener('dragend', () => {
                row.style.opacity = '1';
                row.style.background = 'white';
                const rows = this.goalsListContainer.querySelectorAll('[data-index]');
                rows.forEach(r => {
                    r.style.borderTop = '';
                    r.style.borderBottom = '';
                });
            });
            
            row.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                const rect = row.getBoundingClientRect();
                const relativeY = e.clientY - rect.top;
                if (relativeY < rect.height / 2) {
                    row.style.borderTop = '2px solid #3b82f6';
                    row.style.borderBottom = '';
                } else {
                    row.style.borderBottom = '2px solid #3b82f6';
                    row.style.borderTop = '';
                }
            });
            
            row.addEventListener('dragleave', () => {
                row.style.borderTop = '';
                row.style.borderBottom = '';
            });
            
            row.addEventListener('drop', (e) => {
                e.preventDefault();
                row.style.borderTop = '';
                row.style.borderBottom = '';
                
                const sourceIdx = parseInt(e.dataTransfer.getData('text/plain'));
                if (isNaN(sourceIdx) || sourceIdx === idx) return;
                
                const rect = row.getBoundingClientRect();
                const relativeY = e.clientY - rect.top;
                
                let targetIdx = idx;
                if (relativeY >= rect.height / 2) {
                    targetIdx = idx + 1;
                }
                
                const item = this.editingGoalsList[sourceIdx];
                this.editingGoalsList.splice(sourceIdx, 1);
                
                let insertIdx = targetIdx;
                if (sourceIdx < targetIdx) {
                    insertIdx = targetIdx - 1;
                }
                
                this.editingGoalsList.splice(insertIdx, 0, item);
                this.renderActiveGoalsList();
            });

            // Grab handle
            const handle = document.createElement('span');
            handle.style.cssText = 'color: #cbd5e1; margin-right: 12px; cursor: grab; font-size: 16px; user-select: none;';
            handle.innerHTML = '☰';
            
            const textSpan = document.createElement('span');
            textSpan.style.cssText = 'font-size: 13px; color: #1e293b; font-weight: 500; cursor: pointer; flex: 1; margin-right: 15px; padding: 2px 4px; border-radius: 4px;';
            textSpan.textContent = goal.text;
            textSpan.title = 'Double-click to rename | Drag to reorder';
            
            // Double click to rename
            textSpan.addEventListener('dblclick', () => {
                const input = document.createElement('input');
                input.type = 'text';
                input.value = goal.text;
                input.style.cssText = 'font-size: 13px; font-family: inherit; font-weight: 500; color: #1e293b; padding: 2px 4px; border: 1px solid #3b82f6; border-radius: 4px; flex: 1; outline: none; box-sizing: border-box;';
                
                const saveEdit = () => {
                    const val = input.value.trim();
                    if (val) {
                        goal.text = val;
                        this.editingGoalsList[idx] = goal;
                        this.renderActiveGoalsList();
                    } else {
                        this.renderActiveGoalsList();
                    }
                };
                
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') saveEdit();
                    if (e.key === 'Escape') this.renderActiveGoalsList();
                });
                input.addEventListener('blur', saveEdit);
                
                row.replaceChild(input, textSpan);
                input.focus();
                input.select();
            });
            
            const delBtn = document.createElement('button');
            delBtn.style.cssText = 'background: none; border: none; cursor: pointer; color: #ef4444; font-size: 18px; padding: 0 4px; line-height: 1; font-weight: bold; transition: opacity 0.2s;';
            delBtn.innerHTML = '&times;';
            delBtn.title = 'Delete Goal';
            delBtn.addEventListener('mouseover', () => delBtn.style.opacity = '0.7');
            delBtn.addEventListener('mouseout', () => delBtn.style.opacity = '1');
            delBtn.addEventListener('click', () => {
                this.editingGoalsList.splice(idx, 1);
                this.renderActiveGoalsList();
            });
            
            row.appendChild(handle);
            row.appendChild(textSpan);
            row.appendChild(delBtn);
            this.goalsListContainer.appendChild(row);
        });
    }

    setupGoalsSettingsEventListeners() {
        if (!this.goalsSetSelect) return;
        
        // Select change
        this.goalsSetSelect.addEventListener('change', async (e) => {
            let hasUnsavedChanges = false;
            const systemDefaultGoals = [
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

            let dbGoals = [];
            if (this.activeGoalsSetType === 'default') {
                dbGoals = this.teacherSettings.defaultGoals || systemDefaultGoals;
            } else {
                const setId = this.activeGoalsSetType.replace('custom_', '');
                const set = (this.teacherSettings.customGoalSets || {})[setId];
                dbGoals = (set && set.goals) ? set.goals : [];
            }
            
            if (JSON.stringify(dbGoals) !== JSON.stringify(this.editingGoalsList)) {
                hasUnsavedChanges = true;
            }
            
            if (hasUnsavedChanges) {
                const confirmed = await this.showCustomConfirm('Unsaved Changes', 'You have unsaved changes in this goal set. Switch anyway? (Unsaved edits will be lost)');
                if (!confirmed) {
                    this.goalsSetSelect.value = this.activeGoalsSetType;
                    return;
                }
            }
            
            this.activeGoalsSetType = e.target.value;
            
            // Show/hide delete button
            if (this.deleteGoalSetBtn) {
                if (this.activeGoalsSetType === 'default') {
                    this.deleteGoalSetBtn.classList.add('hidden');
                    this.deleteGoalSetBtn.style.display = 'none';
                } else {
                    this.deleteGoalSetBtn.classList.remove('hidden');
                    this.deleteGoalSetBtn.style.display = 'block';
                }
            }
            
            this.loadActiveSetGoals();
        });
        
        // Add Goal
        const executeAddGoal = () => {
            if (!this.newGoalInput) return;
            const text = this.newGoalInput.value.trim();
            if (!text) return;
            
            this.editingGoalsList.push({
                id: 'goal_' + Date.now() + '_' + Math.floor(Math.random()*1000),
                text: text,
                completed: false
            });
            this.newGoalInput.value = '';
            this.renderActiveGoalsList();
        };
        
        if (this.addGoalToSetBtn) {
            this.addGoalToSetBtn.addEventListener('click', executeAddGoal);
        }
        if (this.newGoalInput) {
            this.newGoalInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') executeAddGoal();
            });
        }
        
        // Create Custom Set
        if (this.createGoalSetBtn) {
            this.createGoalSetBtn.addEventListener('click', async () => {
                const name = await this.showCustomPrompt('New Goals Set', 'Enter a name for the new custom goal set:');
                if (!name) return;
                const trimmed = name.trim();
                if (!trimmed) return;
                
                const setId = 'set_' + Date.now();
                if (!this.teacherSettings.customGoalSets) {
                    this.teacherSettings.customGoalSets = {};
                }
                this.teacherSettings.customGoalSets[setId] = {
                    id: setId,
                    name: trimmed,
                    goals: []
                };
                
                this.activeGoalsSetType = `custom_${setId}`;
                this.populateGoalsSetDropdown();
                this.loadActiveSetGoals();
            });
        }
        
        // Delete Custom Set
        if (this.deleteGoalSetBtn) {
            this.deleteGoalSetBtn.addEventListener('click', async () => {
                if (this.activeGoalsSetType === 'default') return;
                const setId = this.activeGoalsSetType.replace('custom_', '');
                const customSets = this.teacherSettings.customGoalSets || {};
                const set = customSets[setId];
                const setName = set ? set.name : 'this set';
                
                const confirmed = await this.showCustomConfirm('Delete Goal Set', `Are you sure you want to delete the custom goal set '${setName}'?`);
                if (!confirmed) return;
                
                delete customSets[setId];
                this.activeGoalsSetType = 'default';
                this.populateGoalsSetDropdown();
                this.loadActiveSetGoals();
            });
        }
        
        // Reset to system defaults
        if (this.resetGoalsToDefaultBtn) {
            this.resetGoalsToDefaultBtn.addEventListener('click', async () => {
                const confirmed = await this.showCustomConfirm('Reset to Defaults', "Reset the editor's current list to system default goals? This will overwrite your current edits in the editor (you must click Save to persist to the database).");
                if (!confirmed) return;
                
                const systemDefaultGoals = [
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
                
                this.editingGoalsList = JSON.parse(JSON.stringify(systemDefaultGoals));
                this.renderActiveGoalsList();
            });
        }
        
        // Save Settings
        if (this.saveGoalsSettingsBtn) {
            this.saveGoalsSettingsBtn.addEventListener('click', async () => {
                this.saveGoalsSettingsBtn.disabled = true;
                this.saveGoalsSettingsBtn.textContent = '⏳ Saving...';
                
                try {
                    const teacherUid = this.firebaseManager.currentUser.uid;
                    
                    if (this.activeGoalsSetType === 'default') {
                        this.teacherSettings.defaultGoals = this.editingGoalsList;
                    } else {
                        const setId = this.activeGoalsSetType.replace('custom_', '');
                        if (!this.teacherSettings.customGoalSets) {
                            this.teacherSettings.customGoalSets = {};
                        }
                        if (this.teacherSettings.customGoalSets[setId]) {
                            this.teacherSettings.customGoalSets[setId].goals = this.editingGoalsList;
                        }
                    }
                    
                    await this.firebaseManager.database.ref(`studentProgress/${teacherUid}/settings`).set(this.teacherSettings);
                    
                    this.saveGoalsSettingsBtn.textContent = '✅ Saved!';
                    this.saveGoalsSettingsBtn.style.background = '#10b981';
                    
                    setTimeout(() => {
                        this.saveGoalsSettingsBtn.textContent = '💾 Save Goals Set';
                        this.saveGoalsSettingsBtn.style.background = '#3b82f6';
                        this.saveGoalsSettingsBtn.disabled = false;
                    }, 2000);
                } catch (err) {
                    console.error('Error saving goals settings:', err);
                    alert('Save failed: Database write permission denied.');
                    this.saveGoalsSettingsBtn.textContent = '💾 Save Goals Set';
                    this.saveGoalsSettingsBtn.style.background = '#3b82f6';
                    this.saveGoalsSettingsBtn.disabled = false;
                }
            });
        }
    }

    showCustomConfirm(title, message) {
        return new Promise((resolve) => {
            const modal = document.getElementById('customConfirmModal');
            const titleEl = document.getElementById('customConfirmTitle');
            const msgEl = document.getElementById('customConfirmMessage');
            const okBtn = document.getElementById('customConfirmOkBtn');
            const cancelBtn = document.getElementById('customConfirmCancelBtn');
            
            if (!modal || !msgEl || !okBtn || !cancelBtn) {
                resolve(window.confirm(message));
                return;
            }
            
            titleEl.textContent = title || 'Confirm';
            msgEl.textContent = message;
            
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

    showCustomPrompt(title, placeholder) {
        return new Promise((resolve) => {
            const modal = document.getElementById('customPromptModal');
            const titleEl = document.getElementById('customPromptTitle');
            const inputEl = document.getElementById('customPromptInput');
            const okBtn = document.getElementById('customPromptOkBtn');
            const cancelBtn = document.getElementById('customPromptCancelBtn');
            
            if (!modal || !inputEl || !okBtn || !cancelBtn) {
                resolve(window.prompt(title));
                return;
            }
            
            titleEl.textContent = title || 'Enter Name';
            inputEl.value = '';
            inputEl.placeholder = placeholder || '';
            
            const handleOk = () => {
                const val = inputEl.value.trim();
                cleanup();
                resolve(val || null);
            };
            
            const handleCancel = () => {
                cleanup();
                resolve(null);
            };
            
            const cleanup = () => {
                okBtn.removeEventListener('click', handleOk);
                cancelBtn.removeEventListener('click', handleCancel);
                modal.classList.add('hidden');
                modal.style.display = 'none';
            };
            
            okBtn.addEventListener('click', handleOk);
            cancelBtn.addEventListener('click', handleCancel);
            
            inputEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleOk();
                }
            });
            
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
            setTimeout(() => inputEl.focus(), 50);
        });
    }
}

// Initialize when ready
document.addEventListener('DOMContentLoaded', () => {
    window.teacherDashboard = new TeacherDashboard();
});
