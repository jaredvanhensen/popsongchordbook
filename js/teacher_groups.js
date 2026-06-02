// Student Groups Page Logic

class TeacherGroupsDashboard {
    constructor() {
        this.firebaseManager = new FirebaseManager();
        this.groupsGrid = document.getElementById('groupsGrid');
        
        // Group Modal elements
        this.createGroupBtn = document.getElementById('createGroupBtn');
        this.groupModal = document.getElementById('groupModal');
        this.groupNameInput = document.getElementById('groupNameInput');
        this.groupStudentChecklist = document.getElementById('groupStudentChecklist');
        this.closeGroupModalBtn = document.getElementById('closeGroupModalBtn');
        this.saveGroupBtn = document.getElementById('saveGroupBtn');
        this.editGroupId = document.getElementById('editGroupId');
        
        this.students = [];
        this.groups = {};
        this.allProgress = {};

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
    }

    async loadDashboard(user) {
        try {
            // Real-time listener for groups data
            this.firebaseManager.database.ref(`studentProgress/${user.uid}`).on('value', (snapshot) => {
                this.allProgress = snapshot.val() || {};
                this.groups = this.allProgress.groups || {};
                this.renderGroups();
            });

            // Fetch roster to map students in checklists and displays
            const result = await this.firebaseManager.getConnectedStudents();
            if (result.success) {
                this.students = result.students || [];
                this.renderGroups();
            } else {
                this.showError('Failed to load connected students roster: ' + result.error);
            }
        } catch (e) {
            console.error('Groups load error', e);
            this.showError('Failed to initialize groups dashboard.');
        }
    }

    renderGroups() {
        if (!this.groupsGrid) return;
        
        const groupList = Object.values(this.groups);
        this.groupsGrid.innerHTML = '';
        
        if (groupList.length === 0) {
            this.groupsGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <p>No groups created yet.</p>
                    <p style="font-size: 13px; margin-top: 10px;">Click the "+ Create Group" button above to get started!</p>
                </div>
            `;
            return;
        }
        
        groupList.forEach(group => {
            const card = document.createElement('div');
            card.className = 'group-card';
            
            // Map student UIDs to capitalized names
            const names = (group.studentUids || []).map(uid => {
                const student = this.students.find(s => s.uid === uid);
                if (student) {
                    if (student.name) return student.name;
                    const prefix = student.email.split('@')[0];
                    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
                }
                return 'Unknown';
            }).join(', ');
            
            card.innerHTML = `
                <div style="min-width: 0; flex: 1;">
                    <div style="font-weight: 700; color: #1e293b; font-size: 15px;">${group.name}</div>
                    <div style="font-size: 12px; color: #64748b; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${names}">
                        👤 ${names || 'No students in this group'}
                    </div>
                </div>
                <div style="display: flex; gap: 12px; flex-shrink: 0; margin-left: 15px;">
                    <button class="btn-edit-group" style="background: none; border: none; cursor: pointer; font-size: 16px; padding: 4px;" title="Edit Group">✏️</button>
                    <button class="btn-delete-group" style="background: none; border: none; cursor: pointer; font-size: 16px; padding: 4px;" title="Delete Group">🗑️</button>
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

    openGroupModal(group = null) {
        if (!this.groupModal) return;
        
        const errorEl = document.getElementById('groupFormError');
        if (errorEl) errorEl.style.display = 'none';
        
        this.groupNameInput.value = group ? group.name : '';
        this.editGroupId.value = group ? group.id : '';
        document.getElementById('groupModalTitle').textContent = group ? 'Edit Group' : 'Create Group';
        
        // Populate Student Checklist checkboxes
        this.groupStudentChecklist.innerHTML = '';
        if (this.students.length === 0) {
            this.groupStudentChecklist.innerHTML = '<div style="color: #64748b; font-size: 13px; text-align: center; padding: 10px 0;">No connected students found.</div>';
        } else {
            this.students.forEach(student => {
                const isChecked = group && group.studentUids && group.studentUids.includes(student.uid);
                
                const emailPrefix = student.email.split('@')[0];
                const capitalizedPrefix = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
                const displayName = student.name ? student.name : capitalizedPrefix;
                
                const label = document.createElement('label');
                label.style.cssText = 'display: flex; align-items: center; gap: 8px; font-size: 13px; color: #334155; cursor: pointer; padding: 4px 0;';
                label.innerHTML = `
                    <input type="checkbox" value="${student.uid}" ${isChecked ? 'checked' : ''} style="cursor: pointer;">
                    <span>${displayName} (${student.email})</span>
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

    showError(msg) {
        if (this.groupsGrid) {
            this.groupsGrid.innerHTML = `
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
    window.teacherGroupsDashboard = new TeacherGroupsDashboard();
});
