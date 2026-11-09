import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';

import { AuthService } from '../core/auth.service';
import { Destino, destinoDe } from '../core/legado';
import { NotificacaoService } from '../core/notificacao.service';

interface ItemMenu {
  rotulo: string;
  icone: string;
  destino: Destino;
}

const CATEGORIAS: Record<string, string> = {
  '1': 'Coordenador',
  '2': 'Professor Orientador',
  '3': 'Aluno/Estagiário',
  '4': 'Concedente/Local de Estágio',
  '5': 'Supervisor',
  '6': 'Curso/Instituição de Ensino',
  '99': 'Usuário Geral',
};

/** Estrutura das telas autenticadas: cabeçalho com menu do usuário, conteúdo e rodapé. */
@Component({
  selector: 'app-casca',
  imports: [RouterLink, RouterOutlet, MatButtonModule, MatDividerModule, MatMenuModule],
  templateUrl: './casca.html',
  styleUrl: './casca.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Casca {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificacao = inject(NotificacaoService);

  protected readonly usuario = this.auth.usuario;
  protected readonly ano = new Date().getFullYear();

  protected readonly iniciais = computed(() => {
    const partes = (this.usuario()?.nome ?? '').trim().split(/\s+/).filter(Boolean);
    const primeira = partes[0]?.[0] ?? '';
    const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
    return (primeira + ultima).toUpperCase() || '?';
  });

  /** Mesma regra de exibição do legado: uma categoria pelo nome, várias como "Várias categorias". */
  protected readonly categoria = computed(() => {
    const valor = this.usuario()?.categoria;
    if (valor === null || valor === undefined || valor === '') {
      return 'Não informado';
    }
    const codigos = String(valor).split(',').map((codigo) => codigo.trim());
    if (codigos.length > 1) {
      return 'Várias categorias';
    }
    return CATEGORIAS[codigos[0]] ?? codigos[0];
  });

  protected readonly descricaoConta = computed(() => {
    const nivel = this.usuario()?.nivelacesso ?? '';
    const categoria = this.categoria();
    return categoria === nivel || categoria === 'Não informado' ? nivel : `${categoria} · ${nivel}`;
  });

  protected readonly itens = computed<ItemMenu[]>(() => {
    const itens: ItemMenu[] = [
      { rotulo: 'Módulos', icone: 'fa-solid fa-table-cells-large', destino: destinoDe('/') },
      { rotulo: 'Meu perfil', icone: 'fa-solid fa-user-gear', destino: destinoDe('/pessoas/profile') },
      { rotulo: 'Alterar senha', icone: 'fa-solid fa-key', destino: destinoDe('/alterar-senha') },
    ];
    if (this.auth.administrador()) {
      itens.push(
        { rotulo: 'Pessoas', icone: 'fa-solid fa-users', destino: destinoDe('/admin/pessoas') },
        { rotulo: 'Rotinas administrativas', icone: 'fa-solid fa-gears', destino: destinoDe('/admin/rotinas') },
        { rotulo: 'Módulos do sistema', icone: 'fa-solid fa-layer-group', destino: { rota: '/admin/modulos' } },
      );
    }
    return itens;
  });

  protected sair(): void {
    this.auth.logout().subscribe(() => {
      this.notificacao.sucesso('Você saiu do sistema.');
      void this.router.navigate(['/login']);
    });
  }
}
