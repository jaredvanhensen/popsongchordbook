// ChordDetectorOverlay - UI component for chord detection display
class ChordDetectorOverlay {
    constructor() {
        this.overlay = document.getElementById('chordDetectorOverlay');
        this.toggleButton = document.getElementById('chordDetectorToggle');
        this.chordDisplay = document.getElementById('detectedChord');
        this.statusDisplay = document.getElementById('chordDetectorStatus');
        this.minimizeButton = document.getElementById('chordDetectorMinimize');
        this.audioLevelIndicator = document.getElementById('audioLevelIndicator');
        this.microphoneSelect = document.getElementById('microphoneSelect');
        this.header = this.overlay ? this.overlay.querySelector('.chord-detector-header') : null;
        
        // Chord history elements
        this.chordHistoryList = document.getElementById('chordHistory');
        this.clearHistoryButton = document.getElementById('clearChordHistory');
        this.copyHistoryButton = document.getElementById('copyChordHistory');
        
        // Drag state for chord history
        this.draggedChordIndex = null;
        
        // Touch drag state
        this.touchDragElement = null;
        this.touchDragClone = null;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.isTouchDragging = false;
        this.touchDragTimeout = null;
        
        this.chordDetector = new ChordDetector();
        this.isMinimized = false;
        this.isActive = false;
        
        // Chord history state
        this.chordHistory = [];
        this.maxHistoryLength = 50; // Maximum number of chords to keep
        
        // Dragging state
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        
        // Button dragging state (for minimized icon)
        this.isButtonDragging = false;
        this.isButtonDragActive = false; // Flag to track if drag session is active
        this.buttonDragStartX = 0;
        this.buttonDragStartY = 0;
        this.buttonStartLeft = 0;
        this.buttonStartTop = 0;
        this.buttonClickStartTime = 0;
        this.buttonHasMoved = false;
        this.buttonMouseMoveHandler = null;
        this.buttonMouseUpHandler = null;
        this.buttonTouchMoveHandler = null;
        this.buttonTouchEndHandler = null;
        
        // Start minimized by default
        if (this.overlay) {
            this.overlay.classList.add('minimized');
            this.isMinimized = true;
            // Update button to show maximize icon (not minimize)
            if (this.minimizeButton) {
                this.minimizeButton.textContent = '🔺';
                this.minimizeButton.title = 'Maximize';
            }
            // Load saved position
            this.loadPosition();
        }
        
        this.setupEventListeners();
        this.setupChordDetector();
        this.setupDragging();
        this.setupMicrophoneSelection();
        this.loadChordHistory();
    }
    
    setupEventListeners() {
        if (this.toggleButton) {
            // Click handling for the toggle button
            this.toggleButton.addEventListener('click', (e) => {
                e.stopPropagation();
                // If minimized, expand first, otherwise toggle listening
                if (this.isMinimized) {
                    this.toggleMinimize();
                } else {
                    this.toggleListening();
                }
            });
        }
        
        if (this.minimizeButton) {
            this.minimizeButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent dragging when clicking minimize
                this.toggleMinimize();
            });
        }
        
        // Clear history button
        if (this.clearHistoryButton) {
            this.clearHistoryButton.addEventListener('click', () => {
                this.clearChordHistory();
            });
        }
        
        // Copy history button
        if (this.copyHistoryButton) {
            this.copyHistoryButton.addEventListener('click', () => {
                this.copyChordHistoryToClipboard();
            });
        }
    }
    
    setupDragging() {
        if (!this.overlay || !this.header) return;
        
        // Make header draggable
        this.header.style.cursor = 'move';
        this.header.setAttribute('draggable', 'false'); // Prevent default drag
        
        // Mouse events
        this.header.addEventListener('mousedown', (e) => {
            if (e.target === this.minimizeButton || this.minimizeButton?.contains(e.target)) {
                return; // Don't drag when clicking minimize button
            }
            this.startDrag(e);
        });
        
        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.onDrag(e);
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.endDrag();
            }
        });
        
        // Touch events for mobile
        this.header.addEventListener('touchstart', (e) => {
            if (e.target === this.minimizeButton || this.minimizeButton?.contains(e.target)) {
                return;
            }
            this.startDrag(e.touches[0]);
            e.preventDefault();
        });
        
        document.addEventListener('touchmove', (e) => {
            if (this.isDragging) {
                this.onDrag(e.touches[0]);
                e.preventDefault();
            }
        });
        
        document.addEventListener('touchend', () => {
            if (this.isDragging) {
                this.endDrag();
            }
        });
    }
    
    startDrag(e) {
        this.isDragging = true;
        const rect = this.overlay.getBoundingClientRect();
        this.dragOffset.x = e.clientX - rect.left;
        this.dragOffset.y = e.clientY - rect.top;
        this.overlay.style.transition = 'none'; // Disable transition during drag
        document.body.style.userSelect = 'none'; // Prevent text selection
    }
    
    onDrag(e) {
        if (!this.isDragging) return;
        
        const x = e.clientX - this.dragOffset.x;
        const y = e.clientY - this.dragOffset.y;
        
        // Keep overlay within viewport
        const maxX = window.innerWidth - this.overlay.offsetWidth;
        const maxY = window.innerHeight - this.overlay.offsetHeight;
        
        const constrainedX = Math.max(0, Math.min(x, maxX));
        const constrainedY = Math.max(0, Math.min(y, maxY));
        
        this.overlay.style.left = constrainedX + 'px';
        this.overlay.style.top = constrainedY + 'px';
        this.overlay.style.right = 'auto';
    }
    
    endDrag() {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.overlay.style.transition = ''; // Re-enable transition
        document.body.style.userSelect = ''; // Re-enable text selection
        this.savePosition();
    }
    
    savePosition() {
        if (!this.overlay) return;
        const rect = this.overlay.getBoundingClientRect();
        localStorage.setItem('chordDetectorPosition', JSON.stringify({
            x: rect.left,
            y: rect.top
        }));
    }
    
    loadPosition() {
        if (!this.overlay) return;
        try {
            const saved = localStorage.getItem('chordDetectorPosition');
            if (saved) {
                const position = JSON.parse(saved);
                this.overlay.style.left = position.x + 'px';
                this.overlay.style.top = position.y + 'px';
                this.overlay.style.right = 'auto';
            }
        } catch (e) {
            console.warn('Failed to load chord detector position:', e);
        }
    }
    
    setupChordDetector() {
        // Set up chord detection callbacks
        this.chordDetector.setOnChordDetected((chord, confidence) => {
            // Only update display when a chord is actually detected
            // Keep the last chord visible when nothing is detected
            if (chord) {
                this.updateChordDisplay(chord, confidence);
                this.addToChordHistory(chord);
            }
        });
        
        this.chordDetector.setOnStatusChange((status, message) => {
            this.updateStatus(status, message);
        });
        
        // Set up audio level callback
        this.chordDetector.setOnAudioLevel((level) => {
            this.updateAudioLevel(level);
        });
    }
    
    async toggleListening() {
        if (this.isActive) {
            this.stopListening();
        } else {
            await this.startListening();
        }
    }
    
    async startListening() {
        try {
            // Ensure overlay is maximized when starting detection
            if (this.isMinimized) {
                this.toggleMinimize();
            }
            
            // Request permission and update microphone list when starting
            if (!this.hasMicrophonePermission) {
                await this.updateMicrophoneList(true);
                this.hasMicrophonePermission = true;
            }
            
            const selectedDeviceId = this.microphoneSelect?.value || null;
            await this.chordDetector.startListening(selectedDeviceId);
            this.isActive = true;
            this.updateToggleButton(true);
        } catch (error) {
            this.handleError(error);
        }
    }
    
    stopListening() {
        this.chordDetector.stopListening();
        this.isActive = false;
        this.updateToggleButton(false);
        // Don't clear the chord display - keep the last detected chord visible
        // this.updateChordDisplay(null, 0);
        this.updateAudioLevel(0);
    }
    
    updateChordDisplay(chord, confidence) {
        if (this.chordDisplay) {
            // Only update if we have an actual chord - NEVER clear the display
            if (chord) {
                this.chordDisplay.textContent = chord;
                this.chordDisplay.classList.remove('no-chord');
                this.chordDisplay.classList.add('detected-chord');
                this.lastDetectedChord = chord; // Store last chord
                
                // Add confidence indicator (optional visual feedback)
                if (confidence) {
                    const opacity = Math.min(1, 0.6 + (confidence * 0.4));
                    this.chordDisplay.style.opacity = opacity;
                }
            }
            // If chord is null/undefined, do nothing - keep the last chord visible
        }
    }
    
    updateStatus(status, message) {
        if (!this.statusDisplay) return;
        
        let statusText = 'Not active';
        let statusClass = 'status-inactive';
        
        switch (status) {
            case 'listening':
                statusText = '🎤 Microphone active - play a chord';
                statusClass = 'status-listening';
                break;
            case 'stopped':
                statusText = 'Stopped';
                statusClass = 'status-inactive';
                break;
            case 'error':
                statusText = message || 'Error occurred';
                statusClass = 'status-error';
                break;
            default:
                statusText = 'Not active';
                statusClass = 'status-inactive';
        }
        
        this.statusDisplay.textContent = statusText;
        this.statusDisplay.className = `chord-detector-status ${statusClass}`;
    }
    
    updateToggleButton(isActive) {
        if (this.toggleButton) {
            if (isActive) {
                this.toggleButton.classList.add('active');
                this.toggleButton.textContent = '⏸';
                this.toggleButton.title = 'Stop detection';
            } else {
                this.toggleButton.classList.remove('active');
                this.toggleButton.textContent = '🎤';
                this.toggleButton.title = 'Start detection';
            }
        }
    }
    
    handleError(error) {
        let errorMessage = 'Error starting microphone';
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            errorMessage = 'Microphone access denied. Check browser settings.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            errorMessage = 'No microphone found. Check your device.';
        } else if (error.name === 'NotSupportedError') {
            errorMessage = 'Web Audio API not supported in this browser.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        this.updateStatus('error', errorMessage);
        this.isActive = false;
        this.updateToggleButton(false);
        
        // Show alert for critical errors
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            alert(errorMessage);
        }
    }
    
    toggleMinimize() {
        if (!this.overlay) return;
        
        this.isMinimized = !this.isMinimized;
        
        if (this.isMinimized) {
            this.overlay.classList.add('minimized');
            if (this.minimizeButton) {
                this.minimizeButton.textContent = '🔺';
                this.minimizeButton.title = 'Maximize';
            }
        } else {
            this.overlay.classList.remove('minimized');
            if (this.minimizeButton) {
                this.minimizeButton.textContent = '🔻';
                this.minimizeButton.title = 'Minimize';
            }
            // Force reflow to ensure smooth animation
            const body = this.overlay.querySelector('.chord-detector-body');
            if (body) {
                body.offsetHeight; // Trigger reflow
            }
        }
    }
    
    // Public method to ensure overlay is visible
    ensureVisible() {
        if (this.overlay && this.isMinimized) {
            this.toggleMinimize();
        }
    }
    
    updateAudioLevel(level) {
        if (!this.audioLevelIndicator) {
            // Fallback: try to find the element again if it wasn't found initially
            this.audioLevelIndicator = document.getElementById('audioLevelIndicator');
        }
        
        if (this.audioLevelIndicator) {
            const percentage = Math.round(level * 100);
            this.audioLevelIndicator.style.width = `${percentage}%`;
            
            // Change color based on level
            if (level > 0.3) {
                this.audioLevelIndicator.classList.remove('level-low', 'level-medium');
                this.audioLevelIndicator.classList.add('level-high');
            } else if (level > 0.1) {
                this.audioLevelIndicator.classList.remove('level-low', 'level-high');
                this.audioLevelIndicator.classList.add('level-medium');
            } else {
                this.audioLevelIndicator.classList.remove('level-medium', 'level-high');
                this.audioLevelIndicator.classList.add('level-low');
            }
        } else {
            console.warn('Audio level indicator element not found');
        }
    }
    
    async setupMicrophoneSelection() {
        if (!this.microphoneSelect) return;
        
        // Initially show placeholder - don't request permission yet
        this.microphoneSelect.innerHTML = '';
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Choose microphone...';
        this.microphoneSelect.appendChild(placeholder);
        
        // Reload list when devices change (but only if we already have permission)
        navigator.mediaDevices.addEventListener('devicechange', () => {
            if (this.hasMicrophonePermission) {
                this.updateMicrophoneList(true);
            }
        });
        
        // Stop listening if device changes while active
        this.microphoneSelect.addEventListener('change', () => {
            if (this.isActive) {
                this.stopListening();
                // Optionally restart with new device
                setTimeout(() => {
                    this.startListening();
                }, 100);
            }
        });
        
        // Track permission state
        this.hasMicrophonePermission = false;
    }
    
    async updateMicrophoneList(requirePermission = false) {
        if (!this.microphoneSelect) return;
        
        const devices = await this.chordDetector.getAvailableDevices(requirePermission);
        const currentValue = this.microphoneSelect.value;
        
        this.microphoneSelect.innerHTML = '';
        
        if (devices.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = requirePermission ? 'No microphones found' : 'Choose microphone...';
            this.microphoneSelect.appendChild(option);
            return;
        }
        
        devices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label || `Microphone ${devices.indexOf(device) + 1}`;
            this.microphoneSelect.appendChild(option);
        });
        
        // Restore selection if still available
        if (currentValue) {
            const stillExists = Array.from(this.microphoneSelect.options).some(opt => opt.value === currentValue);
            if (stillExists) {
                this.microphoneSelect.value = currentValue;
            }
        }
    }
    
    // Public method to get current detected chord (if needed by other components)
    getCurrentChord() {
        return this.chordDetector.getDetectedChord();
    }
    
    // Chord History Methods
    addToChordHistory(chord) {
        if (!chord) return;
        
        // Don't add if it's the same as the last chord
        if (this.chordHistory.length > 0 && this.chordHistory[this.chordHistory.length - 1] === chord) {
            return;
        }
        
        this.chordHistory.push(chord);
        
        // Limit history length
        if (this.chordHistory.length > this.maxHistoryLength) {
            this.chordHistory.shift();
        }
        
        this.renderChordHistory();
        this.saveChordHistory();
    }
    
    removeFromChordHistory(index) {
        if (index >= 0 && index < this.chordHistory.length) {
            this.chordHistory.splice(index, 1);
            this.renderChordHistory();
            this.saveChordHistory();
        }
    }
    
    moveChordInHistory(fromIndex, toIndex) {
        if (fromIndex === toIndex) return;
        if (fromIndex < 0 || fromIndex >= this.chordHistory.length) return;
        if (toIndex < 0 || toIndex > this.chordHistory.length) return;
        
        const chord = this.chordHistory.splice(fromIndex, 1)[0];
        
        // Adjust toIndex if needed after removal
        if (fromIndex < toIndex) {
            toIndex--;
        }
        
        this.chordHistory.splice(toIndex, 0, chord);
        this.renderChordHistory();
        this.saveChordHistory();
    }
    
    // Touch drag handlers for mobile/tablet
    handleTouchStart(e, item, index) {
        // Clear any existing timeout
        if (this.touchDragTimeout) {
            clearTimeout(this.touchDragTimeout);
        }
        
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.touchDragElement = item;
        this.draggedChordIndex = index;
        
        // Start drag after a short hold to differentiate from scroll
        this.touchDragTimeout = setTimeout(() => {
            this.startTouchDrag(item, touch);
        }, 150);
    }
    
    startTouchDrag(item, touch) {
        this.isTouchDragging = true;
        item.classList.add('dragging');
        
        // Create a clone that follows the finger
        this.touchDragClone = item.cloneNode(true);
        this.touchDragClone.classList.add('touch-drag-clone');
        this.touchDragClone.style.position = 'fixed';
        this.touchDragClone.style.zIndex = '10000';
        this.touchDragClone.style.pointerEvents = 'none';
        this.touchDragClone.style.opacity = '0.9';
        this.touchDragClone.style.transform = 'scale(1.1)';
        this.touchDragClone.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
        
        const rect = item.getBoundingClientRect();
        this.touchDragClone.style.width = rect.width + 'px';
        this.touchDragClone.style.left = (touch.clientX - rect.width / 2) + 'px';
        this.touchDragClone.style.top = (touch.clientY - rect.height / 2) + 'px';
        
        document.body.appendChild(this.touchDragClone);
        
        // Haptic feedback if available
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
    }
    
    handleTouchMove(e) {
        const touch = e.touches[0];
        
        // Check if we've moved enough to cancel the drag start
        if (!this.isTouchDragging && this.touchDragTimeout) {
            const dx = Math.abs(touch.clientX - this.touchStartX);
            const dy = Math.abs(touch.clientY - this.touchStartY);
            
            // If moving mostly vertically, cancel drag (allow scroll)
            if (dy > 10 && dy > dx) {
                clearTimeout(this.touchDragTimeout);
                this.touchDragTimeout = null;
                this.touchDragElement = null;
                this.draggedChordIndex = null;
                return;
            }
        }
        
        if (!this.isTouchDragging) return;
        
        e.preventDefault(); // Prevent scrolling while dragging
        
        // Move the clone
        if (this.touchDragClone) {
            const rect = this.touchDragClone.getBoundingClientRect();
            this.touchDragClone.style.left = (touch.clientX - rect.width / 2) + 'px';
            this.touchDragClone.style.top = (touch.clientY - rect.height / 2) + 'px';
        }
        
        // Find element under touch point
        this.updateTouchDragTarget(touch.clientX, touch.clientY);
    }
    
    updateTouchDragTarget(x, y) {
        // Clear all drag-over classes
        this.chordHistoryList.querySelectorAll('.chord-history-item').forEach(el => {
            el.classList.remove('drag-over', 'drag-over-left', 'drag-over-right');
        });
        
        // Find which element is under the touch
        const elements = document.elementsFromPoint(x, y);
        const targetItem = elements.find(el => 
            el.classList.contains('chord-history-item') && 
            el !== this.touchDragElement
        );
        
        if (targetItem) {
            const rect = targetItem.getBoundingClientRect();
            const midpoint = rect.left + rect.width / 2;
            
            targetItem.classList.add('drag-over');
            if (x < midpoint) {
                targetItem.classList.add('drag-over-left');
            } else {
                targetItem.classList.add('drag-over-right');
            }
        }
    }
    
    handleTouchEnd(e) {
        // Clear the timeout if drag didn't start
        if (this.touchDragTimeout) {
            clearTimeout(this.touchDragTimeout);
            this.touchDragTimeout = null;
        }
        
        if (!this.isTouchDragging) {
            this.touchDragElement = null;
            this.draggedChordIndex = null;
            return;
        }
        
        // Find drop target
        const touch = e.changedTouches[0];
        const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
        const targetItem = elements.find(el => 
            el.classList.contains('chord-history-item') && 
            el !== this.touchDragElement
        );
        
        if (targetItem && this.draggedChordIndex !== null) {
            const targetIndex = parseInt(targetItem.dataset.index);
            const rect = targetItem.getBoundingClientRect();
            const midpoint = rect.left + rect.width / 2;
            
            let newIndex = targetIndex;
            if (touch.clientX >= midpoint && this.draggedChordIndex < targetIndex) {
                newIndex = targetIndex;
            } else if (touch.clientX < midpoint && this.draggedChordIndex > targetIndex) {
                newIndex = targetIndex;
            } else if (touch.clientX >= midpoint) {
                newIndex = targetIndex + 1;
            }
            
            this.moveChordInHistory(this.draggedChordIndex, newIndex);
        }
        
        // Cleanup
        this.cleanupTouchDrag();
    }
    
    cleanupTouchDrag() {
        if (this.touchDragClone && this.touchDragClone.parentNode) {
            this.touchDragClone.parentNode.removeChild(this.touchDragClone);
        }
        
        if (this.touchDragElement) {
            this.touchDragElement.classList.remove('dragging');
        }
        
        this.chordHistoryList.querySelectorAll('.chord-history-item').forEach(el => {
            el.classList.remove('drag-over', 'drag-over-left', 'drag-over-right');
        });
        
        this.touchDragClone = null;
        this.touchDragElement = null;
        this.draggedChordIndex = null;
        this.isTouchDragging = false;
    }
    
    clearChordHistory() {
        this.chordHistory = [];
        this.renderChordHistory();
        this.saveChordHistory();
    }
    
    renderChordHistory() {
        if (!this.chordHistoryList) return;
        
        this.chordHistoryList.innerHTML = '';
        
        if (this.chordHistory.length === 0) {
            this.chordHistoryList.innerHTML = '<div style="color: #999; font-size: 0.8em; padding: 8px 0;">No chords detected yet</div>';
            return;
        }
        
        this.chordHistory.forEach((chord, index) => {
            const item = document.createElement('div');
            item.className = 'chord-history-item';
            item.draggable = true;
            item.dataset.index = index;
            
            const chordName = document.createElement('span');
            chordName.className = 'chord-name';
            chordName.textContent = chord;
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-chord';
            removeBtn.textContent = '×';
            removeBtn.title = 'Remove chord';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeFromChordHistory(index);
            });
            
            // Drag & drop events
            item.addEventListener('dragstart', (e) => {
                this.draggedChordIndex = index;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', index.toString());
            });
            
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                this.draggedChordIndex = null;
                // Remove all drag-over classes
                this.chordHistoryList.querySelectorAll('.chord-history-item').forEach(el => {
                    el.classList.remove('drag-over', 'drag-over-left', 'drag-over-right');
                });
            });
            
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                if (this.draggedChordIndex === null || this.draggedChordIndex === index) return;
                
                // Determine if dropping before or after this item
                const rect = item.getBoundingClientRect();
                const midpoint = rect.left + rect.width / 2;
                
                item.classList.remove('drag-over-left', 'drag-over-right');
                if (e.clientX < midpoint) {
                    item.classList.add('drag-over-left');
                } else {
                    item.classList.add('drag-over-right');
                }
                item.classList.add('drag-over');
            });
            
            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over', 'drag-over-left', 'drag-over-right');
            });
            
            item.addEventListener('drop', (e) => {
                e.preventDefault();
                item.classList.remove('drag-over', 'drag-over-left', 'drag-over-right');
                
                if (this.draggedChordIndex === null || this.draggedChordIndex === index) return;
                
                // Determine drop position
                const rect = item.getBoundingClientRect();
                const midpoint = rect.left + rect.width / 2;
                let targetIndex = index;
                
                if (e.clientX >= midpoint && this.draggedChordIndex < index) {
                    targetIndex = index;
                } else if (e.clientX < midpoint && this.draggedChordIndex > index) {
                    targetIndex = index;
                } else if (e.clientX >= midpoint) {
                    targetIndex = index + 1;
                }
                
                this.moveChordInHistory(this.draggedChordIndex, targetIndex);
            });
            
            // Touch events for mobile/tablet
            item.addEventListener('touchstart', (e) => {
                this.handleTouchStart(e, item, index);
            }, { passive: false });
            
            item.addEventListener('touchmove', (e) => {
                this.handleTouchMove(e);
            }, { passive: false });
            
            item.addEventListener('touchend', (e) => {
                this.handleTouchEnd(e);
            });
            
            item.appendChild(chordName);
            item.appendChild(removeBtn);
            this.chordHistoryList.appendChild(item);
        });
        
        // Scroll to the end to show latest chord
        this.chordHistoryList.scrollTop = this.chordHistoryList.scrollHeight;
    }
    
    saveChordHistory() {
        try {
            localStorage.setItem('chordHistory', JSON.stringify(this.chordHistory));
        } catch (e) {
            console.warn('Failed to save chord history:', e);
        }
    }
    
    loadChordHistory() {
        try {
            const saved = localStorage.getItem('chordHistory');
            if (saved) {
                this.chordHistory = JSON.parse(saved);
                this.renderChordHistory();
            } else {
                this.renderChordHistory(); // Show empty state
            }
        } catch (e) {
            console.warn('Failed to load chord history:', e);
            this.chordHistory = [];
            this.renderChordHistory();
        }
    }
    
    // Get the chord history (for external use)
    getChordHistory() {
        return [...this.chordHistory];
    }
    
    // Copy chord history to clipboard
    async copyChordHistoryToClipboard() {
        if (this.chordHistory.length === 0) {
            return;
        }
        
        const chordText = this.chordHistory.join(' ');
        
        try {
            await navigator.clipboard.writeText(chordText);
            
            // Visual feedback
            if (this.copyHistoryButton) {
                const originalText = this.copyHistoryButton.textContent;
                this.copyHistoryButton.textContent = '✓';
                this.copyHistoryButton.classList.add('copied');
                
                setTimeout(() => {
                    this.copyHistoryButton.textContent = originalText;
                    this.copyHistoryButton.classList.remove('copied');
                }, 1500);
            }
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            // Fallback for older browsers
            this.fallbackCopyToClipboard(chordText);
        }
    }
    
    fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            if (this.copyHistoryButton) {
                const originalText = this.copyHistoryButton.textContent;
                this.copyHistoryButton.textContent = '✓';
                this.copyHistoryButton.classList.add('copied');
                
                setTimeout(() => {
                    this.copyHistoryButton.textContent = originalText;
                    this.copyHistoryButton.classList.remove('copied');
                }, 1500);
            }
        } catch (err) {
            console.error('Fallback copy failed:', err);
        }
        
        document.body.removeChild(textArea);
    }
}

