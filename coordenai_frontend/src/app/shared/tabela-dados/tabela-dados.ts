import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  TemplateRef,
  computed,
  contentChild,
  contentChildren,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

/** Definição de uma coluna da tabela. */
export interface ColunaTabela<T> {
  /** Identificador da coluna. Por padrão também é o nome do campo exibido. */
  chave: string;
  titulo: string;
  /** Valor exibido, ordenado e pesquisado. Padrão: `linha[chave]`. */
  valor?: (linha: T) => string | number | null | undefined;
  /** Padrão: true. */
  ordenavel?: boolean;
  alinhamento?: 'inicio' | 'centro' | 'fim';
  largura?: string;
}

/**
 * Conteúdo personalizado para as células de uma coluna:
 * `<ng-template appCelula="status" let-linha>...</ng-template>`
 */
@Directive({ selector: 'ng-template[appCelula]' })
export class CelulaTabela {
  readonly coluna = input.required<string>({ alias: 'appCelula' });
  readonly template = inject<TemplateRef<{ $implicit: unknown }>>(TemplateRef);
}

/**
 * Botões de ação de cada linha (última coluna):
 * `<ng-template appAcoesLinha let-linha>...</ng-template>`
 */
@Directive({ selector: 'ng-template[appAcoesLinha]' })
export class AcoesLinhaTabela {
  readonly template = inject<TemplateRef<{ $implicit: unknown }>>(TemplateRef);
}

function semAcento(texto: unknown): string {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Tabela padrão do sistema: pesquisa, ordenação, paginação e os estados de
 * carregamento, erro e lista vazia. As telas informam apenas dados e colunas.
 *
 * Trabalha com os dados já carregados no navegador, como as listagens do
 * legado. Para listas grandes, a paginação deve passar a ser feita na API.
 */
@Component({
  selector: 'app-tabela-dados',
  imports: [
    NgTemplateOutlet,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSortModule,
    MatTableModule,
  ],
  templateUrl: './tabela-dados.html',
  styleUrl: './tabela-dados.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabelaDados<T extends object> {
  readonly dados = input.required<readonly T[]>();
  readonly colunas = input.required<readonly ColunaTabela<T>[]>();
  readonly carregando = input(false);
  /** Mensagem de erro do carregamento; quando informada substitui a tabela. */
  readonly erro = input<string | null>(null);
  readonly pesquisavel = input(true);
  readonly rotuloPesquisa = input('Pesquisar');
  readonly mensagemVazia = input('Nenhum registro encontrado.');
  readonly tamanhosPagina = input<number[]>([10, 25, 50]);
  /** Descrição da tabela para leitores de tela. */
  readonly descricao = input('Tabela de dados');

  /** Emitido pelo botão "Tentar novamente" do estado de erro. */
  readonly recarregar = output<void>();

  protected readonly fonte = new MatTableDataSource<T>([]);
  protected readonly termo = signal('');
  protected readonly totalFiltrado = signal(0);

  private readonly celulas = contentChildren(CelulaTabela);
  private readonly acoes = contentChild(AcoesLinhaTabela);
  private readonly ordenacao = viewChild(MatSort);
  private readonly paginador = viewChild(MatPaginator);

  protected readonly templateAcoes = computed(() => this.acoes()?.template ?? null);

  protected readonly colunasExibidas = computed(() => {
    const chaves = this.colunas().map((coluna) => coluna.chave);
    return this.templateAcoes() ? [...chaves, '__acoes'] : chaves;
  });

  private readonly templatesPorColuna = computed(
    () => new Map(this.celulas().map((celula) => [celula.coluna(), celula.template])),
  );

  constructor() {
    this.fonte.sortingDataAccessor = (linha, chave) => {
      const valor = this.valorDe(linha, chave);
      return typeof valor === 'number' ? valor : semAcento(valor);
    };

    this.fonte.filterPredicate = (linha, filtro) =>
      this.colunas().some((coluna) => semAcento(this.valorDe(linha, coluna.chave)).includes(filtro));

    effect(() => {
      this.fonte.data = [...this.dados()];
      this.atualizarTotal();
    });

    effect(() => {
      this.fonte.sort = this.ordenacao() ?? null;
      this.fonte.paginator = this.paginador() ?? null;
    });
  }

  protected templateDe(chave: string): TemplateRef<{ $implicit: unknown }> | null {
    return this.templatesPorColuna().get(chave) ?? null;
  }

  protected texto(linha: T, chave: string): string {
    const valor = this.valorDe(linha, chave);
    return valor === null || valor === undefined || valor === '' ? '—' : String(valor);
  }

  protected pesquisar(valor: string): void {
    this.termo.set(valor);
    this.fonte.filter = semAcento(valor.trim());
    this.fonte.paginator?.firstPage();
    this.atualizarTotal();
  }

  private valorDe(linha: T, chave: string): string | number | null | undefined {
    const coluna = this.colunas().find((c) => c.chave === chave);
    if (coluna?.valor) {
      return coluna.valor(linha);
    }
    return (linha as Record<string, string | number | null | undefined>)[chave];
  }

  private atualizarTotal(): void {
    this.totalFiltrado.set(this.fonte.filteredData.length);
  }
}
