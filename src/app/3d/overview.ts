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
import { Router, RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HLM_CHART_THEME, HlmChartImports, hlmChartTooltip } from '@spartan-ng/helm/chart';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { defineChart, lineY } from '@tanstack/charts';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { scalePoint } from '@tanstack/charts/scales/point';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  CCM_PART_CATALOG,
  CcmPartId,
  CcmPartInfo,
  CcmSceneHandle,
  createCcmScene,
} from './ccm-scene';

@Component({
  imports: [
    HlmCardImports,
    HlmButtonImports,
    HlmSidebarImports,
    HlmTableImports,
    HlmChartImports,
    RouterLink,
  ],
  selector: 'app-overview',
  styleUrl: './overview.scss',
  templateUrl: './overview.html',
})
export class Overview {
  private readonly viewport = viewChild.required<ElementRef<HTMLDivElement>>('viewport');
  private readonly tempChartHost = viewChild<ElementRef<HTMLElement>>('tempChartHost');
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly paused = signal(false);
  protected readonly hovered = signal<CcmPartInfo | null>(null);
  protected readonly selected = signal<CcmPartId | null>(null);
  protected readonly hoveredId = signal<CcmPartId | null>(null);
  /** Bumps when part changes so CSS cloud animation restarts. */
  protected readonly calloutKey = signal(0);
  /** Offset from final corner to the hovered part (px), for cloud travel. */
  protected readonly calloutFrom = signal({ x: 160, y: 140 });
  /** Absolute origin inside viewport-wrap where the mist starts. */
  protected readonly calloutOrigin = signal({ x: 180, y: 160 });

  protected readonly liveFills = signal({ ladleA: 72, ladleB: 88, tundish: 68 });
  protected readonly liveMeta = signal({
    activeLadle: 'a' as 'a' | 'b',
    rotating: false,
    pouring: true,
    turretAngleDeg: 0,
  });

  protected readonly sequenceHeatsColumns = [
    'Heat Number',
    'Heat Start',
    'Heat End',
    'Ladle Arrival',
    'Weight L1',
    'Seq of Total Seq',
    'Weight HSTS',
    'Steel Grade',
  ];

  protected readonly sequenceHeatsRows = [
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

  /** Test temps (°C) in 1500–1600 range vs time. */
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

  private readonly tempChartHeight = signal(160);

  protected readonly tempChartOptions = computed(() => ({
    definition: defineChart(
      {
        marks: [
          lineY(this.tempSeries, {
            x: 'time',
            y: 'temp',
            points: true,
            strokeWidth: 2.2,
            stroke: 'var(--neon-amber, #ffcc33)',
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
    ariaLabel: 'Temperature vs time',
    height: this.tempChartHeight(),
  }));

  protected readonly kpiCards = computed(() => {
    const fills = this.liveFills();
    const meta = this.liveMeta();
    const statusFor = (id: 'a' | 'b') =>
      meta.rotating ? 'Indexing' : meta.activeLadle === id ? 'Casting' : 'Charging';
    return [
      CCM_PART_CATALOG.turret,
      this.withStatus(this.withFill(CCM_PART_CATALOG['ladle-a'], fills.ladleA), statusFor('a')),
      this.withStatus(this.withFill(CCM_PART_CATALOG['ladle-b'], fills.ladleB), statusFor('b')),
      this.withFill(CCM_PART_CATALOG.tundish, fills.tundish, 'Level'),
      CCM_PART_CATALOG['strand-1'],
      CCM_PART_CATALOG['strand-2'],
      CCM_PART_CATALOG['casting-line'],
    ];
  });

  private renderer?: THREE.WebGLRenderer;
  private camera?: THREE.PerspectiveCamera;
  private controls?: OrbitControls;
  private scene?: THREE.Scene;
  private ccm?: CcmSceneHandle;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private raf = 0;
  private resizeObserver?: ResizeObserver;
  private chartResizeObserver?: ResizeObserver;
  private clock = new THREE.Clock();
  private pointerDown = new THREE.Vector2();
  private dragging = false;
  private readonly _fitCenter = new THREE.Vector3(0, 0, 5.5);
  private readonly _fitSize = new THREE.Vector3();
  private readonly _fitDir = new THREE.Vector3(0.72, 0.42, 0.55).normalize();
  private readonly _proj = new THREE.Vector3();
  private fitDistance = 28;
  private lastCalloutPartId: CcmPartId | null = null;

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
    const sync = () => {
      const next = Math.max(120, Math.floor(host.clientHeight));
      this.tempChartHeight.set(next);
    };
    sync();
    this.chartResizeObserver = new ResizeObserver(sync);
    this.chartResizeObserver.observe(host);
  }

  protected resetCamera(): void {
    this.fitCameraToModel();
  }

  /** Frame entire CCM in view. */
  private fitCameraToModel(): void {
    if (!this.camera || !this.controls || !this.ccm) return;

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
    this.fitDistance = Math.max(fitHeightDist, fitWidthDist) * 0.72;

    this.camera.position.copy(this._fitCenter).addScaledVector(this._fitDir, this.fitDistance);
    this.controls.target.copy(this._fitCenter);
    this.controls.minDistance = this.fitDistance * 0.35;
    this.controls.maxDistance = this.fitDistance * 2.8;
    this.camera.near = Math.max(0.1, this.fitDistance / 120);
    this.camera.far = Math.max(200, this.fitDistance * 8);
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  protected togglePause(): void {
    this.paused.update((v) => !v);
  }

  protected focusPart(id: CcmPartId): void {
    this.ccm?.setHighlight(id);
    this.selected.set(id);
    this.setHovered(id);
  }

  private partInfo(id: CcmPartId): CcmPartInfo {
    const base = CCM_PART_CATALOG[id];
    const fills = this.liveFills();
    if (id === 'ladle-a') return this.withFill(base, fills.ladleA);
    if (id === 'ladle-b') return this.withFill(base, fills.ladleB);
    if (id === 'tundish') return this.withFill(base, fills.tundish, 'Level');
    return base;
  }

  private setHovered(id: CcmPartId | null): void {
    this.hoveredId.set(id);
    if (!id) {
      this.hovered.set(null);
      this.lastCalloutPartId = null;
      return;
    }
    const info = this.partInfo(id);
    this.hovered.set(info);
    if (this.lastCalloutPartId !== id) {
      this.lastCalloutPartId = id;
      this.updateCalloutOrigin(id);
      this.calloutKey.update((k) => k + 1);
    }
  }

  /** Project part anchor into viewport-wrap space for the cloud animation. */
  private updateCalloutOrigin(id: CcmPartId): void {
    const wrap = this.viewport()?.nativeElement?.parentElement;
    const cam = this.camera;
    const anchor = this.ccm?.getPartAnchor(id);
    if (!wrap || !cam || !anchor) {
      this.calloutFrom.set({ x: 160, y: 140 });
      this.calloutOrigin.set({ x: 180, y: 160 });
      return;
    }

    this._proj.copy(anchor).project(cam);
    const rect = wrap.getBoundingClientRect();
    const ox = THREE.MathUtils.clamp((this._proj.x * 0.5 + 0.5) * rect.width, 24, rect.width - 24);
    const oy = THREE.MathUtils.clamp((-this._proj.y * 0.5 + 0.5) * rect.height, 24, rect.height - 24);
    const finalLeft = 16;
    const finalTop = 16;
    this.calloutOrigin.set({ x: ox, y: oy });
    this.calloutFrom.set({ x: ox - finalLeft, y: oy - finalTop });
  }

  private withFill(part: CcmPartInfo, pct: number, label = 'Fill'): CcmPartInfo {
    return {
      ...part,
      fields: part.fields.map((field) =>
        field.label === label || field.label === 'Fill' || field.label === 'Level'
          ? { ...field, label, value: `${pct}%` }
          : field,
      ),
    };
  }

  private withStatus(part: CcmPartInfo, status: string): CcmPartInfo {
    return {
      ...part,
      fields: part.fields.map((field) =>
        field.label === 'Status' ? { ...field, value: status } : field,
      ),
    };
  }

  private initScene(): void {
    const host = this.viewport().nativeElement;
    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000814);
    scene.fog = new THREE.FogExp2(0x000814, 0.006);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 400);
    camera.position.set(24, 16, 22);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.enableRotate = true;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minPolarAngle = 0.12;
    controls.zoomSpeed = 0.9;
    controls.panSpeed = 0.8;
    controls.target.set(0, 4, 6);
    controls.update();

    const hemi = new THREE.HemisphereLight(0x7ec8ff, 0x001018, 1.1);
    scene.add(hemi);
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
    this.controls = controls;
    this.ccm = ccm;

    this.fitCameraToModel();

    const canvas = renderer.domElement;
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointerup', this.onPointerUp);

    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(host);

    this.animate();
  }

  private animate = () => {
    this.raf = requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.controls?.update();
    if (!this.paused()) {
      this.ccm?.update(dt);
      const live = this.ccm?.getLiveState();
      if (live) {
        const next = {
          ladleA: Math.round(live.ladleAFill * 100),
          ladleB: Math.round(live.ladleBFill * 100),
          tundish: Math.round(live.tundishFill * 100),
        };
        const prev = this.liveFills();
        if (
          prev.ladleA !== next.ladleA ||
          prev.ladleB !== next.ladleB ||
          prev.tundish !== next.tundish
        ) {
          this.liveFills.set(next);
          const hid = this.hoveredId();
          if (hid) this.hovered.set(this.partInfo(hid));
        }
        const meta = this.liveMeta();
        if (
          meta.activeLadle !== live.activeLadle ||
          meta.rotating !== live.rotating ||
          meta.pouring !== live.pouring ||
          Math.round(meta.turretAngleDeg) !== Math.round(live.turretAngleDeg)
        ) {
          this.liveMeta.set({
            activeLadle: live.activeLadle,
            rotating: live.rotating,
            pouring: live.pouring,
            turretAngleDeg: live.turretAngleDeg,
          });
        }
      }
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  private onResize(): void {
    const host = this.viewport()?.nativeElement;
    if (!host || !this.camera || !this.renderer) return;
    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.fitCameraToModel();
  }

  private onPointerDown = (event: PointerEvent) => {
    this.pointerDown.set(event.clientX, event.clientY);
    this.dragging = false;
  };

  private onPointerMove = (event: PointerEvent) => {
    // Only track drag — no mouse-hover highlight on the model
    const dx = event.clientX - this.pointerDown.x;
    const dy = event.clientY - this.pointerDown.y;
    if (Math.hypot(dx, dy) > 4) this.dragging = true;
  };

  private onPointerUp = (event: PointerEvent) => {
    if (this.dragging || !this.renderer || !this.camera || !this.ccm) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = [...this.ccm.selectables.values()].flatMap((entry) => entry.meshes);
    const hits = this.raycaster.intersectObjects(meshes, false);
    const id = hits[0]?.object.userData['ccmId'] as CcmPartId | undefined;
    if (!id) return;

    this.selected.set(id);
    this.ccm.setHighlight(id);
    this.setHovered(id);
    void this.router.navigateByUrl(CCM_PART_CATALOG[id].route);
  };

  private teardown(): void {
    cancelAnimationFrame(this.raf);
    this.resizeObserver?.disconnect();
    this.chartResizeObserver?.disconnect();
    const canvas = this.renderer?.domElement;
    if (canvas) {
      canvas.removeEventListener('pointermove', this.onPointerMove);
      canvas.removeEventListener('pointerdown', this.onPointerDown);
      canvas.removeEventListener('pointerup', this.onPointerUp);
    }
    this.controls?.dispose();
    this.ccm?.dispose();
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
    this.scene = undefined;
    this.camera = undefined;
    this.renderer = undefined;
    this.controls = undefined;
    this.ccm = undefined;
  }
}
