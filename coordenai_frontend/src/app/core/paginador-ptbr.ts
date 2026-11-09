import { Injectable } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';

/** Textos do paginador das tabelas em português. */
@Injectable()
export class PaginadorPtBr extends MatPaginatorIntl {
  override itemsPerPageLabel = 'Itens por página';
  override nextPageLabel = 'Próxima página';
  override previousPageLabel = 'Página anterior';
  override firstPageLabel = 'Primeira página';
  override lastPageLabel = 'Última página';

  override getRangeLabel = (pagina: number, tamanho: number, total: number): string => {
    if (total === 0 || tamanho === 0) {
      return `0 de ${total}`;
    }
    const inicio = pagina * tamanho + 1;
    const fim = Math.min((pagina + 1) * tamanho, total);
    return `${inicio}–${fim} de ${total}`;
  };
}
