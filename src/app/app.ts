import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePencil, lucideCheck, lucideBan } from '@ng-icons/lucide';
import { HlmButtonGroupImports } from '@spartan-ng/helm/button-group';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmCard } from '../../libs/ui/card/src';
import { HlmSliderImports } from '@spartan-ng/helm/slider';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmSwitch } from '@spartan-ng/helm/switch';
import { HlmLabel } from '@spartan-ng/helm/label';

@Component({
  imports: [
    HlmTableImports,
    HlmInputImports,
    HlmFieldImports,
    HlmCardImports,
    HlmButtonImports,
    NgIcon,
    HlmButtonGroupImports,
    HlmSelectImports,
    HlmCard,
	HlmSliderImports,
	HlmSeparatorImports,
	HlmLabel, HlmSwitch
],
  providers: [provideIcons({ lucidePencil, lucideCheck, lucideBan })],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('angular-22');
  protected readonly _plannedHeatsColumns = [
    'Heat Number',
    'Heat Status',
    'Stage Name',
    'Ladle Empty Weight',
    'Weight HSTS',
    'Ladle Code',
    'Steel Grade',
    'Seq of Total Seq',
    'Length',
    'Width',
    'Thickness',
    'Target Temp',
    'Analysis Request',
  ];
  protected readonly _plannedHeatsRows = [
    {
      heatNumber: '92608161',
      heatStatus: 'LSGC',
      stageName: 'Stage 1',
      ladleEmptyWeight: '100000',
      weightHSTS: '100000',
      ladleCode: '100000',
      steelGrade: '100000',
      seqOfTotalSeq: '100000',
      length: '100000',
      width: '100000',
      thickness: '100000',
      targetTemp: '100000',
      analysisRequest: '100000',
    },
    {
      heatNumber: '92608161',
      heatStatus: 'LSGC',
      stageName: 'Stage 1',
      ladleEmptyWeight: '100000',
      weightHSTS: '100000',
      ladleCode: '100000',
      steelGrade: '100000',
      seqOfTotalSeq: '100000',
      length: '100000',
      width: '100000',
      thickness: '100000',
      targetTemp: '100000',
      analysisRequest: '100000',
    },
    {
      heatNumber: '92608161',
      heatStatus: 'LSGC',
      stageName: 'Stage 1',
      ladleEmptyWeight: '100000',
      weightHSTS: '100000',
      ladleCode: '100000',
      steelGrade: '100000',
      seqOfTotalSeq: '100000',
      length: '100000',
      width: '100000',
      thickness: '100000',
      targetTemp: '100000',
      analysisRequest: '100000',
    },
    {
      heatNumber: '92608161',
      heatStatus: 'LSGC',
      stageName: 'Stage 1',
      ladleEmptyWeight: '100000',
      weightHSTS: '100000',
      ladleCode: '100000',
      steelGrade: '100000',
      seqOfTotalSeq: '100000',
      length: '100000',
      width: '100000',
      thickness: '100000',
      targetTemp: '100000',
      analysisRequest: '100000',
    },
    {
      heatNumber: '92608161',
      heatStatus: 'LSGC',
      stageName: 'Stage 1',
      ladleEmptyWeight: '100000',
      weightHSTS: '100000',
      ladleCode: '100000',
      steelGrade: '100000',
      seqOfTotalSeq: '100000',
      length: '100000',
      width: '100000',
      thickness: '100000',
      targetTemp: '100000',
      analysisRequest: '100000',
    },
  ];
  protected readonly _sequenceHeatsColumns = [
    'Heat Number',
    'Heat Start',
    'Heat End',
    'Ladle Arrival',
    'Weight L1',
    'Seq of Total Seq',
    'Weight HSTS',
    'Steel Grade',
    'MIS Info',
    'Default Heat',
  ];
  protected readonly _sequenceHeatsRows = [
    {
      heatNumber: '92608161',
      heatStart: '2026-08-16 11:12:31',
      heatEnd: '2026-08-16 11:12:31',
      ladleArrival: '92608161',
      weightL1: '92608161',
      seqOfTotalSeq: '92608161',
      weightHSTS: '92608161',
      steelGrade: '92608161',
    },
	{
		heatNumber: '92608161',
		heatStart: '2026-08-16 11:12:31',
		heatEnd: '2026-08-16 11:12:31',
		ladleArrival: '92608161',
		weightL1: '92608161',
		seqOfTotalSeq: '92608161',
		weightHSTS: '92608161',
		steelGrade: '92608161',
	  },
	  {
		heatNumber: '92608161',
		heatStart: '2026-08-16 11:12:31',
		heatEnd: '2026-08-16 11:12:31',
		ladleArrival: '92608161',
		weightL1: '92608161',
		seqOfTotalSeq: '92608161',
		weightHSTS: '92608161',
		steelGrade: '92608161',
	  },
	  {
		heatNumber: '92608161',
		heatStart: '2026-08-16 11:12:31',
		heatEnd: '2026-08-16 11:12:31',
		ladleArrival: '92608161',
		weightL1: '92608161',
		seqOfTotalSeq: '92608161',
		weightHSTS: '92608161',
		steelGrade: '92608161',
	  },
	  {
		heatNumber: '92608161',
		heatStart: '2026-08-16 11:12:31',
		heatEnd: '2026-08-16 11:12:31',
		ladleArrival: '92608161',
		weightL1: '92608161',
		seqOfTotalSeq: '92608161',
		weightHSTS: '92608161',
		steelGrade: '92608161',
	  },
  ];

  protected getKeys(obj: any): string[] {
    return Object.keys(obj);
  }
}
