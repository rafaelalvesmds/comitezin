import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  templateUrl: './confirm-modal.html',
  styleUrl: './confirm-modal.css',
})
export class ConfirmModal {
  title = input<string>('Tem certeza?');
  message = input<string>('Esta ação não pode ser desfeita.');
  confirmText = input<string>('Confirmar');
  cancelText = input<string>('Cancelar');
  isDanger = input<boolean>(true);

  confirm = output<void>();
  cancel = output<void>();

  onConfirm() {
    this.confirm.emit();
  }

  onCancel() {
    this.cancel.emit();
  }
}
