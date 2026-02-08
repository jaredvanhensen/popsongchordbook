class BpmEditModal {
    constructor() {
        this.element = null;
        this.onConfirm = null;
        this.onCancel = null;
        this.render();
    }

    render() {
        if (this.element) return;

        this.element = document.createElement('div');
        this.element.className = 'modal-overlay hidden bpm-edit-modal-overlay';
        this.element.style.zIndex = '100000';
        this.element.innerHTML = `
            <div class="modal-content bpm-edit-modal">
                <div class="modal-header">
                    <h3 class="modal-title">Edit Tempo (BPM):</h3>
                    <button class="modal-close" id="bpmEditModalClose">&times;</button>
                </div>
                <div class="modal-body">
                    <input type="number" id="bpmEditInput" class="chord-edit-input" placeholder="e.g. 120" min="1" max="999" maxlength="3" style="text-align: center; font-size: 2em; width: 100%; box-sizing: border-box;">
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" id="bpmEditModalConfirm" style="flex: 1;">OK</button>
                    <button class="btn btn-secondary" id="bpmEditModalCancel" style="flex: 1;">Cancel</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.element);

        // Bind events
        const closeBtn = this.element.querySelector('#bpmEditModalClose');
        const cancelBtn = this.element.querySelector('#bpmEditModalCancel');
        const confirmBtn = this.element.querySelector('#bpmEditModalConfirm');
        const input = this.element.querySelector('#bpmEditInput');
        const overlay = this.element;

        const closeModal = () => this.hide();

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', () => {
            if (this.onCancel) this.onCancel();
            this.hide();
        });

        const handleConfirm = () => {
            const val = input.value.trim();
            if (val && !isNaN(val)) {
                if (this.onConfirm) this.onConfirm(parseInt(val));
            }
            this.hide();
        };

        confirmBtn.addEventListener('click', handleConfirm);

        // Limit to 3 digits manually just in case
        input.addEventListener('input', () => {
            if (input.value.length > 3) {
                input.value = input.value.slice(0, 3);
            }
        });

        // Confirm on Enter
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleConfirm();
            }
        });

        // Close on background click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                if (this.onCancel) this.onCancel();
                this.hide();
            }
        });

        // Handle Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.element.classList.contains('hidden')) {
                if (this.onCancel) this.onCancel();
                this.hide();
            }
        });
    }

    show(currentValue, onConfirm, onCancel = null) {
        if (!this.element) this.render();

        const input = this.element.querySelector('#bpmEditInput');
        input.value = currentValue || '';

        this.onConfirm = onConfirm;
        this.onCancel = onCancel;

        this.element.classList.remove('hidden');

        // Focus and select all for quick editing
        setTimeout(() => {
            input.focus();
            input.select();
        }, 50);
    }

    hide() {
        if (this.element) {
            this.element.classList.add('hidden');
        }
        this.onConfirm = null;
        this.onCancel = null;
    }
}
