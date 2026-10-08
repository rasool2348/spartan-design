import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideBan, lucideCheck, lucidePencil } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmButtonGroupImports } from '@spartan-ng/helm/button-group';
import { HlmCard, HlmCardImports } from '@spartan-ng/helm/card';
import { HLM_CHART_THEME, HlmChartImports, hlmChartTooltip } from '@spartan-ng/helm/chart';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { HlmSliderImports } from '@spartan-ng/helm/slider';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { barY, colorLegend, defineChart, lineY } from '@tanstack/charts';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { scalePoint } from '@tanstack/charts/scales/point';
import { scaleBand } from '@tanstack/charts/scales/band';

@Component({
  imports: [
    HlmTableImports,
    HlmInputImports,
    HlmFieldImports,
    HlmCardImports,
    HlmButtonImports,
    HlmButtonGroupImports,
    HlmSelectImports,
    HlmCard,
    HlmSliderImports,
    HlmSeparatorImports,
    HlmSidebarImports,
    HlmChartImports,
  ],
  providers: [provideIcons({ lucidePencil, lucideCheck, lucideBan })],
  selector: 'app-trend',
  styleUrl: './trend.scss',
  templateUrl: './trend.html',
})
export class Trend implements OnDestroy {
  private readonly trendChartHost = viewChild<ElementRef<HTMLElement>>('trendChartHost');
  private readonly barChartHost = viewChild<ElementRef<HTMLElement>>('barChartHost');

  private readonly trendChartHeight = signal(320);
  private readonly barChartHeight = signal(320);
  private resizeObserver?: ResizeObserver;

  protected readonly title = signal('angular-22');
  protected readonly _temperaturesColumns = ['Temperature', 'Temperature Time'];
  protected readonly _temperaturesRows = [
    {
      temperature: '1000',
      temperatureTime: '2026-01-01 10:00:00',
    },
    {
      temperature: '1000',
      temperatureTime: '2026-01-01 10:00:00',
    },
    {
      temperature: '1000',
      temperatureTime: '2026-01-01 10:00:00',
    },
    {
      temperature: '1000',
      temperatureTime: '2026-01-01 10:00:00',
    },
    {
      temperature: '1000',
      temperatureTime: '2026-01-01 10:00:00',
    },
    {
      temperature: '1000',
      temperatureTime: '2026-01-01 10:00:00',
    },
    {
      temperature: '1000',
      temperatureTime: '2026-01-01 10:00:00',
    },
    {
      temperature: '1000',
      temperatureTime: '2026-01-01 10:00:00',
    },
    {
      temperature: '1000',
      temperatureTime: '2026-01-01 10:00:00',
    },
    {
      temperature: '1000',
      temperatureTime: '2026-01-01 10:00:00',
    },
    {
      temperature: '1200',
      temperatureTime: '2026-01-01 11:00:00',
    },
    {
      temperature: '1300',
      temperatureTime: '2026-01-01 12:00:00',
    },
    {
      temperature: '1400',
      temperatureTime: '2026-01-01 13:00:00',
    },
    {
      temperature: '1500',
      temperatureTime: '2026-01-01 14:00:00',
    },
  ];
  protected readonly _chartData = [
    {
      time: '2026-01-01 10:00:00',
      values: 1500,
      channel: 'Tundish Weight',
    },
    {
      time: '2026-01-01 10:00:00',
      values: 1500,
      channel: 'Tundish Temp',
    },
    {
      time: '2026-01-01 12:00:00',
      values: 1400,
      channel: 'Tundish Weight',
    },
    {
      time: '2026-01-01 12:00:00',
      values: 1600,
      channel: 'Tundish Temp',
    },
    {
      time: '2026-01-01 13:00:00',
      values: 1300,
      channel: 'Tundish Weight',
    },
    {
      time: '2026-01-01 13:00:00',
      values: 1550,
      channel: 'Tundish Temp',
    },
    {
      time: '2026-01-01 16:00:00',
      values: 1000,
      channel: 'Tundish Weight',
    },
    {
      time: '2026-01-01 16:00:00',
      values: 1640,
      channel: 'Tundish Temp',
    },
  ];
  protected readonly _chartDataBar = [
    {
      time: '2026-01-01 10:00:00',
      value: 1550,
    },
    {
      time: '2026-01-01 11:00:00',
      value: 1600,
    },
    {
      time: '2026-01-01 12:00:00',
      value: 1500,
    },
    {
      time: '2026-01-01 13:00:00',
      value: 1400,
    },
    {
      time: '2026-01-01 14:00:00',
      value: 1350,
    },
    {
      time: '2026-01-01 15:00:00',
      value: 1500,
    },
    {
      time: '2026-01-01 15:10:00',
      value: 1550,
    },
    {
      time: '2026-01-01 15:20:00',
      value: 1575,
    },
    {
      time: '2026-01-01 15:30:00',
      value: 1425,
    },
    {
      time: '2026-01-01 15:40:00',
      value: 1300,
    },
    {
      time: '2026-01-01 15:50:00',
      value: 1500,
    },
    {
      time: '2026-01-01 16:00:00',
      value: 1380,
    },
    {
      time: '2026-01-01 16:10:00',
      value: 1200,
    },
    {
      time: '2026-01-01 16:20:00',
      value: 1460,
    },
    {
      time: '2026-01-01 16:30:00',
      value: 1420,
    },
    {
      time: '2026-01-01 16:40:00',
      value: 1500,
    },
  ];

  protected readonly chartOptions = computed(() => ({
    definition: defineChart(
      {
        marks: [
          lineY(this._chartData, {
            x: 'time',
            y: 'values',
            z: 'channel',
            points: true,
            strokeWidth: 2.5,
          }),
        ],
        scales: {
          x: {
            scale: () => scalePoint<string>().padding(0.2),
            axis: {
              label: 'Time',
              line: true,
              ticks: {
                size: 10,
                padding: 10,
                format: (value: string) =>
                  value.split(' ')[1].split(':')[0] + ' ' + value.split(' ')[1].split(':')[1],
              },
            },
          },
          y: { scale: scaleLinear, nice: true, grid: true, axis: { label: 'Values' } },
        },
        color: {
          domain: ['Tunish Weight', 'Tundish Temp'],
          legend: colorLegend({ label: 'Tundish' }),
        },
        theme: HLM_CHART_THEME,
      },
      { focus: 'group-x', tooltip: hlmChartTooltip() },
    ),
    ariaLabel: 'Tundish',
    height: this.trendChartHeight(),
  }));

  protected readonly barChartOptions = computed(() => ({
    definition: defineChart(
      {
        marks: [barY(this._chartDataBar, { x: 'time', y: 'value', fill: 'var(--chart-5)' })],
        scales: {
          x: {
            scale: () => scaleBand<string>().paddingInner(0.2).paddingOuter(0.1),
            axis: {
              label: 'Time',
              line: false,
              ticks: {
                size: 10,
                padding: 10,
                format: (value: string) =>
                  value.split(' ')[1].split(':')[0] + ' ' + value.split(' ')[1].split(':')[1],
              },
              tickLabels: { thin: { minGap: 1 } },
            },
          },
          y: { scale: scaleLinear, nice: true, grid: true, axis: { label: 'Temperatures' } },
        },
        color: {
          domain: ['Tundish Temp'],
          legend: colorLegend({ label: 'Temperature' }),
        },
        theme: HLM_CHART_THEME,
      },
      { focus: 'group-x', tooltip: hlmChartTooltip() },
    ),
    ariaLabel: 'Tundish',
    height: this.barChartHeight(),
  }));

  constructor() {
    afterNextRender(() => {
      const trendHost = this.trendChartHost()?.nativeElement;
      const barHost = this.barChartHost()?.nativeElement;
      if (!trendHost || !barHost) {
        return;
      }

      const syncHeight = (el: HTMLElement, setHeight: (value: number) => void) => {
        const next = Math.max(1, Math.floor(el.clientHeight));
        setHeight(next);
      };

      syncHeight(trendHost, (v) => this.trendChartHeight.set(v));
      syncHeight(barHost, (v) => this.barChartHeight.set(v));

      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const height = Math.max(1, Math.floor(entry.contentRect.height));
          if (entry.target === trendHost) {
            this.trendChartHeight.set(height);
          } else if (entry.target === barHost) {
            this.barChartHeight.set(height);
          }
        }
      });

      this.resizeObserver.observe(trendHost);
      this.resizeObserver.observe(barHost);
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  protected getKeys(obj: any): string[] {
    return Object.keys(obj);
  }
}
