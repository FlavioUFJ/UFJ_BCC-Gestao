import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { AuthService } from '../../core/auth.service';
import { mensagemDeErro } from '../../core/erros';
import { Destino, destinoDe } from '../../core/legado';
import { Modulo } from '../../core/modelos';
import { ModulosService } from './modulos.service';

interface CartaoModulo {
  modulo: Modulo;
  destino: Destino;
}

/** Página inicial: módulos do sistema disponíveis ao usuário. */
@Component({
  selector: 'app-modulos',
  imports: [NgTemplateOutlet, RouterLink, MatButtonModule, MatProgressBarModule],
  templateUrl: './modulos.html',
  styleUrl: './modulos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Modulos implements OnInit {
  private readonly servico = inject(ModulosService);

  protected readonly usuario = inject(AuthService).usuario;
  protected readonly primeiroNome = computed(() => (this.usuario()?.nome ?? '').trim().split(/\s+/)[0] ?? '');

  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly cartoes = signal<CartaoModulo[]>([]);

  ngOnInit(): void {
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);

    this.servico.doUsuario().subscribe({
      next: (modulos) => {
        this.cartoes.set(modulos.map((modulo) => ({ modulo, destino: destinoDe(modulo.url) })));
        this.carregando.set(false);
      },
      error: (erro: unknown) => {
        this.erro.set(mensagemDeErro(erro, 'Não foi possível carregar os módulos.'));
        this.carregando.set(false);
      },
    });
  }
}
