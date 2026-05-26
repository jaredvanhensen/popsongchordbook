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
                    // Final fallback: prompt
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

            // Load Avatar
            // Load Avatar
            let avatarUrl = await this.firebaseManager.getUserAvatar(user.uid);
            if (!avatarUrl) avatarUrl = user.photoURL;
            if (avatarUrl) {
                this.updateAvatarUI(avatarUrl);
            }

            // Load Students
            const result = await this.firebaseManager.getConnectedStudents();
            if (result.success) {
                this._allStudents = result.students;
                this.renderStudents(result.students);

                if (result.students.length > 0) {
                    // Show student selector
                    const selectorSection = document.getElementById('studentSelectorSection');
                    const selector = document.getElementById('studentSelector');
                    if (selectorSection && selector) {
                        selectorSection.style.display = 'block';
                        selector.innerHTML = result.students.map(s =>
                            `<option value="${s.uid}">${s.email}</option>`
                        ).join('');
                        selector.addEventListener('change', () => {
                            this.loadProgressForStudent(selector.value);
                        });
                    }
                    // Load first student's progress
                    await this.loadProgressForStudent(result.students[0].uid);
                } else {
                    // No students yet — load teacher's own template/defaults
                    await this.loadProgressForStudent('__teacher_template__');
                }
            } else {
                this.showError('Failed to load students: ' + result.error);
            }

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
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-state-icon">👥</div>
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
            card.innerHTML = `
                <div class="student-email">${student.email}</div>
                <div class="student-meta">Connected: ${dateStr}</div>
            `;

            // Clicking card selects that student in selector & loads their progress
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => {
                const selector = document.getElementById('studentSelector');
                if (selector) selector.value = student.uid;
                this.loadProgressForStudent(student.uid);
                // Scroll to progress section
                document.getElementById('spHomeworkDate').closest('div').scrollIntoView({ behavior: 'smooth', block: 'start' });
            });

            this.studentsGrid.appendChild(card);
        });
    }

    async loadProgressForStudent(studentUid) {
        this._currentStudentUid = studentUid;
        this._currentProgress = null;

        // Show loading state in goals
        const goalsContainer = document.getElementById('spGoalsContainer');
        if (goalsContainer) goalsContainer.innerHTML = '<p style="color:#94a3b8; padding: 12px;">Loading...</p>';

        const result = await this.firebaseManager.getStudentProgress(studentUid);
        if (!result.success) {
            if (goalsContainer) goalsContainer.innerHTML = `<p style="color:red; padding:12px;">Error: ${result.error}</p>`;
            return;
        }

        const progress = result.progress;
        this._currentProgress = JSON.parse(JSON.stringify(progress));

        // Populate Homework
        document.getElementById('spHomeworkText').value = progress.homework?.text || '';
        document.getElementById('spHomeworkDate').value = progress.homework?.date || '';

        // Populate Goals
        this._renderGoals(progress.goals || []);

        // Populate Links
        this._renderLinks(progress.links || []);

        // Wire Save
        const saveBtn = document.getElementById('spSaveBtn');
        if (saveBtn) saveBtn.onclick = () => this._saveStudentProgress(studentUid);

        // Wire Add Link
        const addLinkBtn = document.getElementById('spAddLinkBtn');
        if (addLinkBtn) addLinkBtn.onclick = () => {
            const title = document.getElementById('spNewLinkTitle').value.trim();
            const url = document.getElementById('spNewLinkUrl').value.trim();
            if (!url) { alert('Please enter a URL.'); return; }
            this._currentProgress.links = [...(this._currentProgress.links || []), { title: title || url, url }];
            this._renderLinks(this._currentProgress.links);
            document.getElementById('spNewLinkTitle').value = '';
            document.getElementById('spNewLinkUrl').value = '';
        };
    }

    async openStudentProgress(studentUid, studentEmail) {
        const modal = document.getElementById('studentProgressModal');
        if (!modal) return;

        // Show modal
        modal.style.display = 'flex';
        document.getElementById('spStudentName').textContent = `📊 Progress: ${studentEmail}`;

        // Clear previous state
        document.getElementById('spHomeworkText').value = '';
        document.getElementById('spHomeworkDate').value = '';
        document.getElementById('spGoalsContainer').innerHTML = '<p style="color:#64748b">Loading...</p>';
        document.getElementById('spLinksContainer').innerHTML = '';

        // Store current student uid on modal for save
        modal.dataset.studentUid = studentUid;
        this._currentProgress = null;

        // Fetch progress
        const result = await this.firebaseManager.getStudentProgress(studentUid);
        if (!result.success) {
            document.getElementById('spGoalsContainer').innerHTML = `<p style="color:red">Error: ${result.error}</p>`;
            return;
        }

        const progress = result.progress;
        this._currentProgress = JSON.parse(JSON.stringify(progress)); // deep clone

        // Populate Homework
        document.getElementById('spHomeworkText').value = progress.homework?.text || '';
        document.getElementById('spHomeworkDate').value = progress.homework?.date || '';

        // Populate Goals
        this._renderGoals(progress.goals || []);

        // Populate Links
        this._renderLinks(progress.links || []);

        // Wire up Add Link button
        const addLinkBtn = document.getElementById('spAddLinkBtn');
        addLinkBtn.onclick = () => {
            const title = document.getElementById('spNewLinkTitle').value.trim();
            const url = document.getElementById('spNewLinkUrl').value.trim();
            if (!url) { alert('Please enter a URL.'); return; }
            const newLink = { title: title || url, url };
            this._currentProgress.links = [...(this._currentProgress.links || []), newLink];
            this._renderLinks(this._currentProgress.links);
            document.getElementById('spNewLinkTitle').value = '';
            document.getElementById('spNewLinkUrl').value = '';
        };

        // Wire up Save button
        document.getElementById('spSaveBtn').onclick = () => this._saveStudentProgress(studentUid);

        // Wire up close buttons
        const close = () => { modal.style.display = 'none'; };
        document.getElementById('closeStudentProgressBtn').onclick = close;
        document.getElementById('spCancelBtn').onclick = close;
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); }, { once: true });
    }

    _renderGoals(goals) {
        const container = document.getElementById('spGoalsContainer');
        container.innerHTML = '';

        goals.forEach((goal, idx) => {
            const row = document.createElement('label');
            row.style.cssText = `display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: background 0.15s; ${ goal.completed ? 'background: #d1fae5;' : 'background: white;' }`;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = !!goal.completed;
            checkbox.style.cssText = 'width: 18px; height: 18px; cursor: pointer; accent-color: #10b981;';
            checkbox.addEventListener('change', () => {
                this._currentProgress.goals[idx].completed = checkbox.checked;
                row.style.background = checkbox.checked ? '#d1fae5' : 'white';
            });

            const labelText = document.createElement('span');
            labelText.style.cssText = `font-size: 0.95rem; color: #1e293b; flex: 1; ${ goal.completed ? 'text-decoration: line-through; color: #64748b;' : '' }`;
            labelText.textContent = goal.text;

            // Update text decoration on checkbox change too
            checkbox.addEventListener('change', () => {
                labelText.style.textDecoration = checkbox.checked ? 'line-through' : 'none';
                labelText.style.color = checkbox.checked ? '#64748b' : '#1e293b';
            });

            // Inline edit: double-click to edit goal text
            labelText.title = 'Double-click to edit';
            labelText.addEventListener('dblclick', () => {
                const input = document.createElement('input');
                input.type = 'text';
                input.value = goal.text;
                input.style.cssText = 'flex: 1; padding: 4px 8px; border: 1px solid #3b82f6; border-radius: 4px; font-size: 0.95rem; font-family: inherit;';
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

            row.appendChild(checkbox);
            row.appendChild(labelText);
            container.appendChild(row);
        });
    }

    _renderLinks(links) {
        const container = document.getElementById('spLinksContainer');
        container.innerHTML = '';

        if (!links || links.length === 0) {
            container.innerHTML = '<p style="color: #94a3b8; font-size: 0.9rem;">No links added yet.</p>';
            return;
        }

        links.forEach((link, idx) => {
            const row = document.createElement('div');
            row.style.cssText = 'display: flex; align-items: center; gap: 10px; background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0;';
            row.innerHTML = `
                <a href="${link.url}" target="_blank" style="flex: 1; color: #3b82f6; font-weight: 600; font-size: 0.9rem; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${link.url}">${link.title || link.url}</a>
                <button class="del-link-btn" data-idx="${idx}" style="background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 18px; line-height: 1; padding: 0;" title="Remove link">&times;</button>
            `;
            const delBtn = row.querySelector('.del-link-btn');
            delBtn.addEventListener('click', () => {
                this._currentProgress.links.splice(idx, 1);
                this._renderLinks(this._currentProgress.links);
            });
            container.appendChild(row);
        });
    }

    async _saveStudentProgress(studentUid) {
        const saveBtn = document.getElementById('spSaveBtn');
        if (!saveBtn || !this._currentProgress) return;

        // Collect current homework values from form
        this._currentProgress.homework = {
            text: document.getElementById('spHomeworkText').value.trim(),
            date: document.getElementById('spHomeworkDate').value
        };

        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;

        const result = await this.firebaseManager.updateStudentProgress(studentUid, this._currentProgress);

        if (result.success) {
            saveBtn.textContent = '✅ Saved!';
            saveBtn.style.background = '#10b981';
            setTimeout(() => {
                saveBtn.innerHTML = 'Save Progress';
                saveBtn.style.background = '#3b82f6';
                saveBtn.disabled = false;
            }, 2000);
        } else {
            alert('Save failed: ' + result.error);
            saveBtn.textContent = 'Save Progress';
            saveBtn.disabled = false;
        }
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

            // Simple canvas resize to keep it under Firebase limits
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
        // Clear placeholder and insert image
        this.bannerPlaceholder.innerHTML = `
            <img src="${url}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">
        `;
        // Re-append the button and input so they aren't lost
        this.bannerPlaceholder.appendChild(this.uploadBtn);
        this.bannerPlaceholder.appendChild(this.photoInput);
    }
}

// Initialize when ready
document.addEventListener('DOMContentLoaded', () => {
    window.teacherDashboard = new TeacherDashboard();
});
