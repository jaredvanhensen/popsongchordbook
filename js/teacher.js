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

        // Booking Type & Group Select
        this.bookingStudentContainer = document.getElementById('bookingStudentContainer');
        this.bookingGroupContainer = document.getElementById('bookingGroupContainer');
        this.bookingGroupSelect = document.getElementById('bookingGroupSelect');

        // Deletion Group Options Modal
        this.deleteGroupOptionsModal = document.getElementById('deleteGroupOptionsModal');
        this.deleteGroupSingleStudentBtn = document.getElementById('deleteGroupSingleStudentBtn');
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
        if (this.deleteGroupSingleStudentBtn) {
            this.deleteGroupSingleStudentBtn.addEventListener('click', () => {
                this.executeGroupLessonDeletion('student_only');
            });
        }
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
                this.extractLessons();
                this.renderCalendar();
                this.renderGroups();
                this.populateGroupDropdown();
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
            if (studentUid === 'groups') return;
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
                pill.textContent = `${lesson.time} [${lesson.groupName}]`;
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
                        if (studentUid === 'groups') return;
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
        if (tab === 'students') {
            this.tabStudentsBtn.classList.add('active');
            this.tabStudentsBtn.style.color = '#166534';
            this.tabStudentsBtn.style.borderBottom = '2px solid #166534';
            
            this.tabGroupsBtn.classList.remove('active');
            this.tabGroupsBtn.style.color = '#64748b';
            this.tabGroupsBtn.style.borderBottom = '2px solid transparent';
            
            this.tabStudentsContent.style.display = 'flex';
            this.tabGroupsContent.style.display = 'none';
        } else {
            this.tabGroupsBtn.classList.add('active');
            this.tabGroupsBtn.style.color = '#166534';
            this.tabGroupsBtn.style.borderBottom = '2px solid #166534';
            
            this.tabStudentsBtn.classList.remove('active');
            this.tabStudentsBtn.style.color = '#64748b';
            this.tabStudentsBtn.style.borderBottom = '2px solid transparent';
            
            this.tabStudentsContent.style.display = 'none';
            this.tabGroupsContent.style.display = 'flex';
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
                    if (studentUid === 'groups') return;
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
}

// Initialize when ready
document.addEventListener('DOMContentLoaded', () => {
    window.teacherDashboard = new TeacherDashboard();
});
