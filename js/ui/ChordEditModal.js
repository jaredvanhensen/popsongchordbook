class ChordEditModal {
    constructor() {
        this.element = null;
        this.onConfirm = null;
        this.onCancel = null;
        this.render();
    }

    render() {
        if (this.element) return;

        this.element = document.createElement('div');
        this.element.className = 'modal-overlay hidden chord-edit-modal-overlay';
        this.element.style.zIndex = '100000';
        this.element.innerHTML = `
            <div class="modal-content chord-edit-modal">
                <div class="modal-header">
                    <h3 class="modal-title">Edit Chord:</h3>
                    <button class="modal-close" id="chordEditModalClose">&times;</button>
                </div>
                <div class="modal-body">
                    <input type="text" id="chordEditInput" class="chord-edit-input" placeholder="e.g. C#m7">
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" id="chordEditModalConfirm">OK</button>
                    <button class="btn btn-secondary" id="chordEditModalCancel">Annuleren</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.element);

        // Bind events
        const closeBtn = this.element.querySelector('#chordEditModalClose');
        const cancelBtn = this.element.querySelector('#chordEditModalCancel');
        const confirmBtn = this.element.querySelector('#chordEditModalConfirm');
        const input = this.element.querySelector('#chordEditInput');
        const overlay = this.element;

        const closeModal = () => this.hide();

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', () => {
            if (this.onCancel) this.onCancel();
            this.hide();
        });

        const handleConfirm = () => {
            if (this.onConfirm) this.onConfirm(input.value.trim());
            this.hide();
        };

        confirmBtn.addEventListener('click', handleConfirm);

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

        const input = this.element.querySelector('#chordEditInput');
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
