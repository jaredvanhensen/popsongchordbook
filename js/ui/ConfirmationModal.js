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
            <div class="confirmation-modal">
                <div class="modal-header">
                    <h3 class="modal-title" id="confirmationModalTitle">Confirm</h3>
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
        const cancelBtn = this.element.querySelector('#confirmationModalCancel');
        const confirmBtn = this.element.querySelector('#confirmationModalConfirm');
        const overlay = this.element;

        const closeModal = () => this.hide();
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

    show(title, message, onConfirm, onCancel = null, confirmText = null, type = 'primary', isInfo = false) {
        if (!this.element) this.render();

        const titleEl = this.element.querySelector('#confirmationModalTitle');
        const messageEl = this.element.querySelector('#confirmationModalMessage');
        const confirmBtn = this.element.querySelector('#confirmationModalConfirm');
        const cancelBtn = this.element.querySelector('#confirmationModalCancel');

        titleEl.textContent = title || 'Confirm';
        messageEl.innerHTML = message || 'Are you sure?';

        // Set button text
        confirmBtn.textContent = confirmText || 'OK';

        // Set button style
        confirmBtn.classList.remove('btn-primary', 'btn-danger');
        if (type === 'danger' || (title && title.toLowerCase().includes('delete'))) {
            confirmBtn.classList.add('btn-danger');
            if (!confirmText) confirmBtn.textContent = 'Delete';
        } else {
            confirmBtn.classList.add('btn-primary');
        }

        // Info mode: hide cancel button
        if (isInfo) {
            cancelBtn.style.display = 'none';
        } else {
            cancelBtn.style.display = 'block';
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
