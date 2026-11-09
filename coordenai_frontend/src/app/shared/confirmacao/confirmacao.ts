import { ChangeDetectionStrategy, Component, Injectable, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Observable, map } from 'rxjs';

export interface DadosConfirmacao {
  titulo: string;
  mensagem: string;
  /** Texto do botão que confirma. Padrão: "Confirmar". */
  confirmar?: string;
  cancelar?: string;
  /** Destaca o botão de confirmação como ação destrutiva (ex.: excluir). */
  destrutiva?: boolean;
}

@Component({
  selector: 'app-dialogo-confirmacao',
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ dados.titulo }}</h2>
    <mat-dialog-content>{{ dados.mensagem }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton type="button" [mat-dialog-close]="false">{{ dados.cancelar ?? 'Cancelar' }}</button>
      <button
        matButton="filled"
        type="button"
        cdkFocusInitial
        [class.destrutiva]="dados.destrutiva"
        [mat-dialog-close]="true"
      >
        {{ dados.confirmar ?? 'Confirmar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .destrutiva {
      --mat-button-filled-container-color: var(--mat-sys-error);
      --mat-button-filled-label-text-color: var(--mat-sys-on-error);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogoConfirmacao {
  protected readonly dados = inject<DadosConfirmacao>(MAT_DIALOG_DATA);
}

/** Abre o diálogo padrão de confirmação e emite `true` se o usuário confirmar. */
@Injectable({ providedIn: 'root' })
export class ConfirmacaoService {
  private readonly dialog = inject(MatDialog);

  perguntar(dados: DadosConfirmacao): Observable<boolean> {
    return this.dialog
      .open<DialogoConfirmacao, DadosConfirmacao, boolean>(DialogoConfirmacao, {
        data: dados,
        width: '440px',
        autoFocus: 'dialog',
      })
      .afterClosed()
      .pipe(map((resposta) => resposta === true));
  }
}
