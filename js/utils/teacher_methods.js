
    // --- Teacher-Student Methods ---

    async upgradeToTeacher() {
        if (!this.initialized || !this.currentUser) return { success: false, error: 'Not authenticated' };
        
        try {
            const uid = this.currentUser.uid;
            
            // Generate a random 6-character code
            const generateCode = () => {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                let result = '';
                for (let i = 0; i < 6; i++) {
                    result += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                return 'TEACHER-' + result;
            };

            const code = generateCode();

            // Store code mapped to uid
            await this.database.ref(`teacherCodes/${code}`).set(uid);

            // Update user role and code
            await this.database.ref(`users/${uid}`).update({
                role: 'teacher',
                teacherCode: code
            });

            return { success: true, teacherCode: code };
        } catch (e) {
            console.error('Error upgrading to teacher:', e);
            return { success: false, error: e.message };
        }
    }

    async connectToTeacher(teacherCode) {
        if (!this.initialized || !this.currentUser) return { success: false, error: 'Not authenticated' };
        
        try {
            const uid = this.currentUser.uid;
            const code = teacherCode.trim().toUpperCase();

            // Look up teacherUid from code
            const snapshot = await this.database.ref(`teacherCodes/${code}`).once('value');
            const teacherUid = snapshot.val();

            if (!teacherUid) {
                return { success: false, error: 'Invalid Teacher Code' };
            }

            if (teacherUid === uid) {
                return { success: false, error: 'You cannot connect to yourself' };
            }

            // Link student to teacher in the teacherStudents roster
            await this.database.ref(`teacherStudents/${teacherUid}/${uid}`).set(true);

            // Get teacher's name/email to confirm
            let teacherData = null;
            try {
                const teacherSnapshot = await this.database.ref(`users/${teacherUid}`).once('value');
                teacherData = teacherSnapshot.val();
            } catch (err) {
                console.warn('Could not read teacher profile (ignoring to allow connection):', err);
                teacherData = { email: 'Teacher' }; // Fallback to avoid breaking connection
            }
            
            if (!teacherData) {
                // If not found, revert connection
                await this.database.ref(`teacherStudents/${teacherUid}/${uid}`).remove();
                return { success: false, error: 'Teacher account not found' };
            }

            // Save teacher uid on student profile
            await this.database.ref(`users/${uid}`).update({
                connectedTeacher: teacherUid
            });

            return { 
                success: true, 
                teacherName: teacherData.email || 'Teacher' 
            };
        } catch (e) {
            console.error('Error connecting to teacher:', e);
            return { success: false, error: e.message };
        }
    }

    async getConnectedStudents() {
        if (!this.initialized || !this.currentUser) return { success: false, error: 'Not authenticated' };
        
        try {
            const uid = this.currentUser.uid;
            
            // Get roster
            const rosterSnapshot = await this.database.ref(`teacherStudents/${uid}`).once('value');
            const roster = rosterSnapshot.val();
            
            if (!roster) return { success: true, students: [] };
            
            const studentIds = Object.keys(roster);
            const students = [];

            // Fetch each student's profile
            for (const studentId of studentIds) {
                const studentSnapshot = await this.database.ref(`users/${studentId}`).once('value');
                const studentData = studentSnapshot.val();
                if (studentData) {
                    students.push({
                        uid: studentId,
                        email: studentData.email || 'Unknown',
                        role: studentData.role || 'student',
                        createdAt: studentData.createdAt || null
                    });
                }
            }

            return { success: true, students: students };
        } catch (e) {
            console.error('Error fetching connected students:', e);
            return { success: false, error: e.message };
        }
    }

    async getStudentProgress(studentUid) {
        if (!this.initialized || !this.currentUser) return { success: false, error: 'Not authenticated' };
        
        try {
            const teacherUid = this.currentUser.uid;
            const snapshot = await this.database.ref(`studentProgress/${teacherUid}/${studentUid}`).once('value');
            let progress = snapshot.val();
            
            const defaultGoals = [
                { id: 'goal_0', text: 'Tuning the guitar', completed: false },
                { id: 'goal_1', text: 'C Em G and D chord', completed: false },
                { id: 'goal_2', text: 'Am E Dm chords', completed: false },
                { id: 'goal_3', text: 'F and Bm small barre chord', completed: false },
                { id: 'goal_4', text: 'F and Bb chord', completed: false },
                { id: 'goal_5', text: 'Pentatonic Scale', completed: false },
                { id: 'goal_6', text: 'C major scale', completed: false },
                { id: 'goal_7', text: 'A minor scale', completed: false },
                { id: 'goal_8', text: 'Sus2 and sus4 chords', completed: false },
                { id: 'goal_9', text: 'Seventh chords', completed: false },
                { id: 'goal_10', text: 'Naming all notes on the E and A bass strings', completed: false },
                { id: 'goal_11', text: 'Naming all notes on D and G string', completed: false },
                { id: 'goal_12', text: 'Fingerpicking 3 patterns', completed: false },
                { id: 'goal_13', text: 'Power Chords', completed: false },
                { id: 'goal_14', text: 'Blues improvisation in A', completed: false },
                { id: 'goal_15', text: 'Slide, Bends', completed: false },
                { id: 'goal_16', text: 'Tapping', completed: false },
                { id: 'goal_17', text: 'Naming all notes on all strings', completed: false },
                { id: 'goal_18', text: 'Play 6 chords in a key ( I ii iii IV V vi )', completed: false }
            ];

            if (!progress) {
                // Initialize default progress
                progress = {
                    homework: { text: '', date: '' },
                    goals: [...defaultGoals],
                    links: []
                };
                // Save it immediately so it exists for the student
                await this.database.ref(`studentProgress/${teacherUid}/${studentUid}`).set(progress);
            } else if (progress.goals && progress.goals.length < defaultGoals.length) {
                // Append missing goals to existing student
                for (let i = progress.goals.length; i < defaultGoals.length; i++) {
                    progress.goals.push(defaultGoals[i]);
                }
                await this.database.ref(`studentProgress/${teacherUid}/${studentUid}`).set(progress);
            }
            
            return { success: true, progress };
        } catch (e) {
            console.error('Error fetching student progress:', e);
            return { success: false, error: e.message };
        }
    }

    async updateStudentProgress(studentUid, data) {
        if (!this.initialized || !this.currentUser) return { success: false, error: 'Not authenticated' };
        
        try {
            const teacherUid = this.currentUser.uid;
            await this.database.ref(`studentProgress/${teacherUid}/${studentUid}`).set(data);
            return { success: true };
        } catch (e) {
            console.error('Error updating student progress:', e);
            return { success: false, error: e.message };
        }
    }

    async getStudentProgressAsStudent() {
        if (!this.initialized || !this.currentUser) return { success: false, error: 'Not authenticated' };
        
        try {
            const studentUid = this.currentUser.uid;
            // Get connected teacher
            const userSnap = await this.database.ref(`users/${studentUid}`).once('value');
            const userData = userSnap.val();
            
            if (!userData || !userData.connectedTeacher) {
                return { success: false, error: 'No connected teacher' };
            }
            
            const teacherUid = userData.connectedTeacher;
            
            const snapshot = await this.database.ref(`studentProgress/${teacherUid}/${studentUid}`).once('value');
            const progress = snapshot.val();
            
            return { success: true, progress, teacherUid };
        } catch (e) {
            console.error('Error fetching student progress as student:', e);
            return { success: false, error: e.message };
        }
    }
}
