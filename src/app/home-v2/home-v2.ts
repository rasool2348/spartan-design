import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideActivity,
  lucideBan,
  lucideCheck,
  lucideClock,
  lucideContainer,
  lucideGauge,
  lucideHash,
  lucideLayers,
  lucideListOrdered,
  lucidePencil,
  lucideRuler,
  lucideThermometer,
  lucideTimer,
  lucideWeight,
} from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmButtonGroupImports } from '@spartan-ng/helm/button-group';
import { HlmCard, HlmCardImports } from '@spartan-ng/helm/card';
import { HLM_CHART_THEME, HlmChartImports, hlmChartTooltip } from '@spartan-ng/helm/chart';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { HlmSliderImports } from '@spartan-ng/helm/slider';
import { HlmSwitch } from '@spartan-ng/helm/switch';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { defineChart, lineY } from '@tanstack/charts';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { scalePoint } from '@tanstack/charts/scales/point';
import * as THREE from 'three';
import { CcmSceneHandle, createCcmScene } from '../3d/ccm-scene';

export interface FieldItem {
  label: string;
  value: string;
  unit: string;
  icon: string;
}

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
    HlmLabel,
    HlmSwitch,
    HlmSidebarImports,
    HlmChartImports,
    RouterLink,
  ],
  providers: [
    provideIcons({
      lucidePencil,
      lucideCheck,
      lucideBan,
      lucideHash,
      lucideActivity,
      lucideLayers,
      lucideThermometer,
      lucideClock,
      lucideWeight,
      lucideContainer,
      lucideListOrdered,
      lucideRuler,
      lucideTimer,
      lucideGauge,
    }),
  ],
  selector: 'app-home-v2',
  styleUrl: './home-v2.scss',
  templateUrl: './home-v2.html',
})
export class HomeV2 {
  private readonly destroyRef = inject(DestroyRef);
  private readonly viewport = viewChild.required<ElementRef<HTMLDivElement>>('viewport');
  private readonly tempChartHost = viewChild<ElementRef<HTMLElement>>('tempChartHost');
  private chartResizeObserver?: ResizeObserver;
  private sceneResizeObserver?: ResizeObserver;

  private renderer?: THREE.WebGLRenderer;
  private camera?: THREE.PerspectiveCamera;
  private scene?: THREE.Scene;
  private ccm?: CcmSceneHandle;
  private raf = 0;
  private clock = new THREE.Clock();
  private readonly _fitCenter = new THREE.Vector3(0, 0, 5.5);
  private readonly _fitSize = new THREE.Vector3();
  private readonly _fitDir = new THREE.Vector3(0.72, 0.42, 0.55).normalize();
  private readonly _lookAt = new THREE.Vector3();
  private fitDistance = 28;

  protected readonly title = signal('home-v2');

  protected readonly headerRow1: FieldItem[] = [
    { label: 'Tundish Sequence', value: '2/10', unit: '', icon: 'lucideListOrdered' },
    { label: 'Heat Number', value: '92608161', unit: '', icon: 'lucideHash' },
    { label: 'Heat Status', value: 'LSGC', unit: '', icon: 'lucideActivity' },
    { label: 'Steel Grade', value: '3204', unit: '', icon: 'lucideLayers' },
    { label: 'CCM Status', value: 'Casting On', unit: '', icon: 'lucideActivity' },
    { label: 'Ladle No', value: '1', unit: '', icon: 'lucideContainer' },
    { label: 'Temperature', value: '1560', unit: '°C', icon: 'lucideThermometer' },
    { label: 'Heat Start', value: '11:12', unit: '', icon: 'lucideClock' },
  ];

  protected readonly headerRow2: FieldItem[] = [
    { label: 'Tundish No', value: '1', unit: '', icon: 'lucideContainer' },
    { label: 'Temp Time', value: '11:12:35', unit: '', icon: 'lucideClock' },
    { label: 'Ladle Weight', value: '180000', unit: 'kg', icon: 'lucideWeight' },
    { label: 'Tundishcar No', value: '1', unit: '', icon: 'lucideContainer' },
    { label: 'Sequence Number', value: '20220061', unit: '', icon: 'lucideListOrdered' },
    { label: 'Length', value: '12000', unit: 'mm', icon: 'lucideRuler' },
    { label: 'Time Until End', value: '11', unit: 'min', icon: 'lucideTimer' },
    { label: 'Dim', value: '203×1250', unit: 'mm', icon: 'lucideRuler' },
  ];

  protected readonly allHeaderFields = [...this.headerRow1, ...this.headerRow2];

  protected readonly actionFields: FieldItem[] = [
    { label: 'Actual Speed', value: '5', unit: 'm/min', icon: 'lucideGauge' },
    { label: 'Len L1', value: '1525399', unit: 'mm', icon: 'lucideRuler' },
    { label: 'Len L2', value: '1521459', unit: 'mm', icon: 'lucideRuler' },
  ];

  protected readonly footerFields: FieldItem[] = [
    { label: 'Heat Number', value: '92608161', unit: '', icon: 'lucideHash' },
    { label: 'Tundish No', value: '2', unit: '', icon: 'lucideContainer' },
    { label: 'Ladle No', value: '1', unit: '', icon: 'lucideContainer' },
    { label: 'Ladle Rem Weight', value: '180000', unit: 'kg', icon: 'lucideWeight' },
    { label: 'Cast Len LSGO', value: '0', unit: 'mm', icon: 'lucideRuler' },
    { label: 'Cast Len LSGC', value: '1520834', unit: 'mm', icon: 'lucideRuler' },
    { label: 'Heat Cast Len Str', value: '-', unit: 'mm', icon: 'lucideRuler' },
  ];

  protected readonly _plannedHeatsColumns = [
    'Heat Number',
    'Heat Status',
    'Stage Name',
    'Ladle Empty Weight (kg)',
    'Weight HSTS (kg)',
    'Ladle Code',
    'Steel Grade',
    'Seq of Total Seq',
    'Length (mm)',
    'Width (mm)',
    'Thickness (mm)',
    'Target Temp (°C)',
  ];

  protected readonly _plannedHeatsRows = [
    {
      heatNumber: '92608161',
      heatStatus: 'LSGC',
      stageName: 'Stage 1',
      ladleEmptyWeight: '100000',
      weightHSTS: '100000',
      ladleCode: 'L-12',
      steelGrade: '3204',
      seqOfTotalSeq: '2/10',
      length: '12000',
      width: '1250',
      thickness: '203',
    },
    {
      heatNumber: '92608162',
      heatStatus: 'LSGO',
      stageName: 'Stage 1',
      ladleEmptyWeight: '98000',
      weightHSTS: '102000',
      ladleCode: 'L-14',
      steelGrade: '3204',
      seqOfTotalSeq: '3/10',
      length: '11800',
      width: '1250',
      thickness: '203',
    },
    {
      heatNumber: '92608163',
      heatStatus: 'Plan',
      stageName: 'Stage 2',
      ladleEmptyWeight: '99500',
      weightHSTS: '101500',
      ladleCode: 'L-15',
      steelGrade: '3204',
      seqOfTotalSeq: '4/10',
      length: '12100',
      width: '1250',
      thickness: '203',
    },
    {
      heatNumber: '92608164',
      heatStatus: 'Plan',
      stageName: 'Stage 2',
      ladleEmptyWeight: '100200',
      weightHSTS: '100800',
      ladleCode: 'L-16',
      steelGrade: '3204',
      seqOfTotalSeq: '5/10',
      length: '11950',
      width: '1250',
      thickness: '203',
    },
    {
      heatNumber: '92608165',
      heatStatus: 'Plan',
      stageName: 'Stage 3',
      ladleEmptyWeight: '100000',
      weightHSTS: '100000',
      ladleCode: 'L-17',
      steelGrade: '3204',
      seqOfTotalSeq: '6/10',
      length: '12000',
      width: '1250',
      thickness: '203',
    },
  ];

  protected readonly _sequenceHeatsColumns = [
    'Heat Number',
    'Heat Start',
    'Heat End',
    'Ladle Arrival',
    'Weight L1 (kg)',
    'Seq of Total Seq',
    'Weight HSTS (kg)',
    'Steel Grade',
    'MIS Info',
    'Default Heat',
  ];

  protected readonly _sequenceHeatsRows = [
    {
      heatNumber: '92608161',
      heatStart: '11:12:31',
      heatEnd: '11:48:02',
      ladleArrival: '11:05:10',
      weightL1: '178200',
      seqOfTotalSeq: '2/10',
      weightHSTS: '180000',
      steelGrade: '3204',
    },
    {
      heatNumber: '92608162',
      heatStart: '11:50:00',
      heatEnd: '12:22:14',
      ladleArrival: '11:42:00',
      weightL1: '179100',
      seqOfTotalSeq: '3/10',
      weightHSTS: '180500',
      steelGrade: '3204',
    },
    {
      heatNumber: '92608163',
      heatStart: '12:25:00',
      heatEnd: '12:58:40',
      ladleArrival: '12:18:20',
      weightL1: '177800',
      seqOfTotalSeq: '4/10',
      weightHSTS: '179800',
      steelGrade: '3204',
    },
    {
      heatNumber: '92608164',
      heatStart: '13:01:00',
      heatEnd: '13:34:55',
      ladleArrival: '12:55:30',
      weightL1: '180200',
      seqOfTotalSeq: '5/10',
      weightHSTS: '181000',
      steelGrade: '3204',
    },
    {
      heatNumber: '92608165',
      heatStart: '13:38:00',
      heatEnd: '14:10:12',
      ladleArrival: '13:30:00',
      weightL1: '178900',
      seqOfTotalSeq: '6/10',
      weightHSTS: '180200',
      steelGrade: '3204',
    },
  ];

  /** 8 tundish temperatures (°C) vs time — replaces footer temp fields. */
  private readonly tempSeries = [
    { time: '11:00', temp: 1512 },
    { time: '11:15', temp: 1538 },
    { time: '11:30', temp: 1555 },
    { time: '11:45', temp: 1572 },
    { time: '12:00', temp: 1588 },
    { time: '12:15', temp: 1564 },
    { time: '12:30', temp: 1540 },
    { time: '12:45', temp: 1525 },
  ];

  private readonly tempChartHeight = signal(200);

  protected readonly tempChartOptions = computed(() => ({
    definition: defineChart(
      {
        marks: [
          lineY(this.tempSeries, {
            x: 'time',
            y: 'temp',
            points: true,
            strokeWidth: 2.4,
            stroke: 'var(--chart-1, #ff7a1a)',
          }),
        ],
        scales: {
          x: {
            scale: () => scalePoint<string>().padding(0.15),
            axis: {
              label: 'Time',
              line: true,
              ticks: { size: 6, padding: 6 },
            },
          },
          y: {
            scale: scaleLinear,
            domain: [1500, 1600],
            nice: false,
            grid: true,
            axis: { label: 'Temp °C' },
          },
        },
        theme: HLM_CHART_THEME,
      },
      { focus: 'group-x', tooltip: hlmChartTooltip() },
    ),
    ariaLabel: 'Tundish temperature vs time',
    height: this.tempChartHeight(),
  }));

  constructor() {
    afterNextRender(() => {
      this.initScene();
      this.bindTempChartResize();
      this.destroyRef.onDestroy(() => this.teardown());
    });
  }

  private bindTempChartResize(): void {
    const host = this.tempChartHost()?.nativeElement;
    if (!host) return;
    const sync = () => this.tempChartHeight.set(Math.max(140, Math.floor(host.clientHeight)));
    sync();
    this.chartResizeObserver = new ResizeObserver(sync);
    this.chartResizeObserver.observe(host);
  }

  protected displayValue(field: FieldItem): string {
    return field.unit ? `${field.value} ${field.unit}` : field.value;
  }

  private initScene(): void {
    const host = this.viewport().nativeElement;
    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000814);
    scene.fog = new THREE.FogExp2(0x000814, 0.007);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 400);
    camera.position.set(24, 16, 22);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // View-only: block pointer so no drag / orbit occurs
    renderer.domElement.style.pointerEvents = 'none';
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0x7ec8ff, 0x001018, 1.1));
    const key = new THREE.DirectionalLight(0x00e5ff, 1.35);
    key.position.set(8, 16, 10);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffcc66, 0.35);
    fill.position.set(-10, 8, -6);
    scene.add(fill);
    const rim = new THREE.PointLight(0x00e5ff, 40, 40);
    rim.position.set(0, 8, -4);
    scene.add(rim);

    const ccm = createCcmScene();
    scene.add(ccm.root);

    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.ccm = ccm;

    this.fitCameraToModel();
    this.sceneResizeObserver = new ResizeObserver(() => this.onSceneResize());
    this.sceneResizeObserver.observe(host);
    this.animate();
  }

  private fitCameraToModel(): void {
    if (!this.camera || !this.ccm) return;
    const box = new THREE.Box3();
    for (const entry of this.ccm.selectables.values()) {
      entry.meshes.forEach((mesh) => box.expandByObject(mesh));
    }
    if (box.isEmpty()) return;

    box.getCenter(this._fitCenter);
    box.getSize(this._fitSize);
    const radius = Math.max(this._fitSize.x, this._fitSize.y, this._fitSize.z) * 0.5;
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const fitHeightDist = radius / Math.tan(fov * 0.5);
    const fitWidthDist = fitHeightDist / Math.max(this.camera.aspect, 0.1);
    this.fitDistance = Math.max(fitHeightDist, fitWidthDist) * 0.78;

    this.camera.position.copy(this._fitCenter).addScaledVector(this._fitDir, this.fitDistance);
    this._lookAt.copy(this._fitCenter);
    this.camera.lookAt(this._lookAt);
    this.camera.near = Math.max(0.1, this.fitDistance / 120);
    this.camera.far = Math.max(200, this.fitDistance * 8);
    this.camera.updateProjectionMatrix();
  }

  private onSceneResize(): void {
    const host = this.viewport()?.nativeElement;
    if (!host || !this.camera || !this.renderer) return;
    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.fitCameraToModel();
  }

  private animate = () => {
    this.raf = requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.ccm?.update(dt);
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  private teardown(): void {
    cancelAnimationFrame(this.raf);
    this.chartResizeObserver?.disconnect();
    this.sceneResizeObserver?.disconnect();
    this.ccm?.dispose();
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
    this.scene = undefined;
    this.camera = undefined;
    this.renderer = undefined;
    this.ccm = undefined;
  }
}
