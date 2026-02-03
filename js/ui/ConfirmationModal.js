class ConfirmationModal {
    constructor() {
        this.element = null;
        this.onConfirm = null;
        this.onCancel = null;
        this.render();
    }

    render() {
        if (this.element) return;

        this.element = document.createElement('div');
        this.element.className = 'modal-overlay hidden confirmation-modal-overlay';
        this.element.style.zIndex = '100000'; // Ensure it's on top of everything
        this.element.innerHTML = `
            <div class="modal-content confirmation-modal">
                <div class="modal-header">
                    <h3 class="modal-title" id="confirmationModalTitle">Confirm</h3>
                    <button class="modal-close" id="confirmationModalClose">&times;</button>
                </div>
                <div class="modal-body">
                    <p id="confirmationModalMessage" class="confirmation-message"></p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="confirmationModalCancel">Cancel</button>
                    <button class="btn btn-primary" id="confirmationModalConfirm">Confirm</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.element);

        // Bind events
        const closeBtn = this.element.querySelector('#confirmationModalClose');
        const cancelBtn = this.element.querySelector('#confirmationModalCancel');
        const confirmBtn = this.element.querySelector('#confirmationModalConfirm');
        const overlay = this.element;

        const closeModal = () => this.hide();

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', () => {
            if (this.onCancel) this.onCancel();
            this.hide();
        });

        confirmBtn.addEventListener('click', () => {
            if (this.onConfirm) this.onConfirm();
            this.hide();
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

    show(title, message, onConfirm, onCancel = null) {
        if (!this.element) this.render();

        const titleEl = this.element.querySelector('#confirmationModalTitle');
        const messageEl = this.element.querySelector('#confirmationModalMessage');
        const confirmBtn = this.element.querySelector('#confirmationModalConfirm');
        const cancelBtn = this.element.querySelector('#confirmationModalCancel');

        titleEl.textContent = title || 'Confirm';
        // Allow HTML in message for formatting (e.g. bold song titles)
        messageEl.innerHTML = message || 'Are you sure?';

        // Custom button text if needed? For now, hardcode "Confirm" "Cancel"
        // But let's check if the message implies specific actions like "Remove"
        if (title && title.toLowerCase().includes('remove')) {
            confirmBtn.textContent = 'Remove';
            confirmBtn.classList.add('btn-danger'); // Add red style if we have it
        } else {
            confirmBtn.textContent = 'Confirm';
            confirmBtn.classList.remove('btn-danger');
        }

        this.onConfirm = onConfirm;
        this.onCancel = onCancel;

        this.element.classList.remove('hidden');

        // Focus confirm for ease of use? Or cancel for safety? 
        // Let's focus cancel for safety on destructive actions
        cancelBtn.focus();
    }

    hide() {
        if (this.element) {
            this.element.classList.add('hidden');
        }
        this.onConfirm = null;
        this.onCancel = null;
    }
}
