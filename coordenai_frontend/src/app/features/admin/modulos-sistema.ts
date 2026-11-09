import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';

import { mensagemDeErro } from '../../core/erros';
import { CelulaTabela, ColunaTabela, TabelaDados } from '../../shared/tabela-dados/tabela-dados';
import { ModuloAdmin, ModulosService } from '../modulos/modulos.service';

/**
 * Consulta dos módulos do sistema (administrador).
 *
 * Primeira tela a usar a tabela padrão. A edição de módulos e de vínculos
 * continua nas Rotinas Administrativas do legado até a migração dessa tela.
 */
@Component({
  selector: 'app-modulos-sistema',
  imports: [TabelaDados, CelulaTabela],
  template: `
    <header class="cabecalho-pagina">
      <h1 class="titulo-pagina">Módulos do sistema</h1>
      <p class="subtitulo-pagina">
        Consulta. Para editar módulos ou vínculos, use as Rotinas administrativas.
      </p>
    </header>

    <app-tabela-dados
      descricao="Módulos do sistema"
      rotuloPesquisa="Pesquisar módulo"
      mensagemVazia="Nenhum módulo cadastrado."
      [dados]="modulos()"
      [colunas]="colunas"
      [carregando]="carregando()"
      [erro]="erro()"
      (recarregar)="carregar()"
    >
      <ng-template appCelula="nome" let-modulo>
        <span class="nome">
          <i [class]="modulo.icone || 'fa-solid fa-cube'" [style.color]="modulo.cor || null" aria-hidden="true"></i>
          {{ modulo.nome }}
        </span>
      </ng-template>

      <ng-template appCelula="ativo" let-modulo>
        <span class="etiqueta" [class.etiqueta-inativa]="!modulo.ativo">
          {{ modulo.ativo ? 'Ativo' : 'Inativo' }}
        </span>
      </ng-template>
    </app-tabela-dados>
  `,
  styles: `
    .nome {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-weight: 600;

      i {
        width: 20px;
        text-align: center;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModulosSistema implements OnInit {
  private readonly servico = inject(ModulosService);

  protected readonly modulos = signal<ModuloAdmin[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);

  protected readonly colunas: ColunaTabela<ModuloAdmin>[] = [
    { chave: 'ordem', titulo: 'Ordem', alinhamento: 'fim', largura: '88px' },
    { chave: 'nome', titulo: 'Módulo' },
    { chave: 'descricao', titulo: 'Descrição' },
    { chave: 'url', titulo: 'Endereço' },
    { chave: 'quantidade_vinculos', titulo: 'Pessoas vinculadas', alinhamento: 'fim' },
    { chave: 'ativo', titulo: 'Situação', valor: (modulo) => (modulo.ativo ? 'Ativo' : 'Inativo') },
  ];

  ngOnInit(): void {
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);

    this.servico.todos().subscribe({
      next: (modulos) => {
        this.modulos.set(modulos);
        this.carregando.set(false);
      },
      error: (erro: unknown) => {
        this.erro.set(mensagemDeErro(erro, 'Não foi possível carregar os módulos.'));
        this.carregando.set(false);
      },
    });
  }
}
