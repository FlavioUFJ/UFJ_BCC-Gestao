import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Estrutura das telas sem login: painel da marca ao lado do formulário. */
@Component({
  selector: 'app-casca-visitante',
  imports: [RouterOutlet],
  template: `
    <aside class="marca">
      <img src="logo-coordenai.png" alt="CoordenAI" width="236" height="112" />
      <p class="lema">Coordenação com inteligência</p>
      <p class="instituicao">
        Universidade Federal de Jataí<br />
        Bacharelado em Ciência da Computação
      </p>
    </aside>
    <main class="formulario">
      <div class="cartao">
        <router-outlet />
      </div>
    </main>
  `,
  styleUrl: './casca-visitante.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CascaVisitante {}
