import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-nao-encontrada',
  imports: [RouterLink, MatButtonModule],
  template: `
    <section class="pagina-estreita">
      <h1 class="titulo-pagina">Página não encontrada</h1>
      <p class="subtitulo-pagina">O endereço acessado não existe ou foi movido.</p>
      <a matButton="filled" routerLink="/">Ir para o início</a>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NaoEncontrada {}
