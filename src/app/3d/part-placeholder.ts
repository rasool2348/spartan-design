import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';

@Component({
  selector: 'app-part-placeholder',
  imports: [HlmCardImports, HlmButtonImports, RouterLink],
  template: `
    <div class="placeholder">
      <hlm-card class="panel">
        <h1>{{ title() }}</h1>
        <p>Detail page will be built here. 3D overview navigation is wired.</p>
        <a hlmBtn routerLink="/overview">Back to twin</a>
      </hlm-card>
    </div>
  `,
  styles: `
    .placeholder {
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: 1rem;
      background: var(--background);
    }
    .panel {
      max-width: 420px;
      width: 100%;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    h1 {
      margin: 0;
      color: var(--neon-cyan);
      font-size: 1.1rem;
    }
    p {
      margin: 0;
      color: var(--muted-foreground);
    }
  `,
})
export class PartPlaceholder {
  private readonly route = inject(ActivatedRoute);
  private readonly data = toSignal(this.route.data.pipe(map((d) => d['title'] as string | undefined)));
  private readonly paramMap = toSignal(this.route.paramMap);
  protected readonly title = computed(() => {
    const fromData = this.data() ?? 'Details';
    const id = this.paramMap()?.get('id');
    return id ? `${fromData} (${id})` : fromData;
  });
}
