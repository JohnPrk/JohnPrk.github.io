"use client";

import { useEffect, useRef } from "react";
import type { KeywordHit } from "@/lib/keywords";

export default function ThreeTree({ keywords }: { keywords: KeywordHit[] }) {
  const bgRef = useRef<HTMLDivElement>(null);
  const miniRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      const THREE = await import("three");
      const { OrbitControls } = await import(
        "three/examples/jsm/controls/OrbitControls.js"
      );
      if (cancelled || !bgRef.current || !miniRef.current) return;

      const container = bgRef.current;
      const miniBox = miniRef.current;

      // ---------- scene / cameras / renderer ----------
      const scene = new THREE.Scene();
      const fog = new THREE.FogExp2(0x020e06, 0.012);
      scene.fog = fog;

      const treeGroup = new THREE.Group();
      scene.add(treeGroup);

      const camera = new THREE.PerspectiveCamera(
        55,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      const isMobile = window.innerWidth < 768;
      const focusX = isMobile ? 0 : 20;
      camera.position.set(focusX, 5, 90);

      const miniCamera = new THREE.PerspectiveCamera(
        50,
        miniBox.clientWidth / Math.max(miniBox.clientHeight, 1),
        0.1,
        1000
      );

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.autoClear = false;
      container.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, miniBox);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.8;
      controls.enablePan = false;
      controls.minDistance = 30;
      controls.maxDistance = 150;
      controls.target.set(focusX, 0, 0);

      const baseTreeX = focusX;
      treeGroup.position.x = baseTreeX;

      // ---------- tree geometry: trunk + branches + leaves + roots ----------
      const nodePositions: InstanceType<typeof THREE.Vector3>[] = [];
      const branchEnds: InstanceType<typeof THREE.Vector3>[] = [];

      // trunk cloud (dense cylinder of particles, tapering upward)
      for (let y = -30; y < 10; y += 0.8) {
        const radius = 2 + 12 * Math.exp(-(y + 30) / 10);
        const count = Math.floor(radius * 4);
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const r = Math.random() * radius;
          const twist = y * 0.1;
          nodePositions.push(
            new THREE.Vector3(
              Math.cos(angle + twist) * r,
              y,
              Math.sin(angle + twist) * r
            )
          );
        }
      }

      // branches radiating upward
      const numBranches = 45;
      for (let b = 0; b < numBranches; b++) {
        const startY = -5 + Math.random() * 15;
        const length = 20 + Math.random() * 25;
        const angle = Math.random() * Math.PI * 2;
        const angleElev = ((Math.random() * 0.6 + 0.2) * Math.PI) / 2;
        const bx = Math.cos(angle) * Math.sin(angleElev) * length;
        const by = Math.cos(angleElev) * length;
        const bz = Math.sin(angle) * Math.sin(angleElev) * length;
        for (let t = 0; t < 1; t += 0.05) {
          const curveY = startY + by * t - Math.pow(t, 2) * 5;
          const px = bx * t + (Math.random() - 0.5) * 2;
          const py = curveY + (Math.random() - 0.5) * 2;
          const pz = bz * t + (Math.random() - 0.5) * 2;
          nodePositions.push(new THREE.Vector3(px, py, pz));
        }
        branchEnds.push(new THREE.Vector3(bx, startY + by - 5, bz));
      }

      // leaf clusters at branch tips
      branchEnds.forEach((end) => {
        const clusterSize = 8 + Math.random() * 6;
        const leafCount = 120 + Math.random() * 100;
        for (let i = 0; i < leafCount; i++) {
          const a = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          const r = clusterSize * Math.cbrt(Math.random());
          nodePositions.push(
            new THREE.Vector3(
              end.x + Math.sin(phi) * Math.cos(a) * r,
              end.y + Math.cos(phi) * r,
              end.z + Math.sin(phi) * Math.sin(a) * r
            )
          );
        }
      });

      // roots below
      for (let b = 0; b < 20; b++) {
        const length = 15 + Math.random() * 20;
        const angle = Math.random() * Math.PI * 2;
        for (let t = 0; t < 1; t += 0.05) {
          const px = Math.cos(angle) * length * t;
          const py = -30 - length * t * 0.6;
          const pz = Math.sin(angle) * length * t;
          nodePositions.push(
            new THREE.Vector3(
              px + (Math.random() - 0.5) * 2,
              py,
              pz + (Math.random() - 0.5) * 2
            )
          );
        }
      }

      const vertices: number[] = [];
      nodePositions.forEach((p) => vertices.push(p.x, p.y, p.z));
      const particlesGeo = new THREE.BufferGeometry();
      particlesGeo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3)
      );

      // round point texture
      const circleCanvas = document.createElement("canvas");
      circleCanvas.width = 32;
      circleCanvas.height = 32;
      const ctx = circleCanvas.getContext("2d")!;
      ctx.beginPath();
      ctx.arc(16, 16, 14, 0, 2 * Math.PI, false);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      const circleTexture = new THREE.CanvasTexture(circleCanvas);

      const pointsMat = new THREE.PointsMaterial({
        color: 0x4ade80,
        size: 0.5,
        map: circleTexture,
        transparent: true,
        opacity: 0.85,
        alphaTest: 0.1,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const particleSystem = new THREE.Points(particlesGeo, pointsMat);
      treeGroup.add(particleSystem);

      // connecting lines (short proximity edges)
      const lineIndices: number[] = [];
      const maxDistSq = 4.5 * 4.5;
      for (let i = 0; i < nodePositions.length; i++) {
        let conns = 0;
        for (let j = i + 1; j < nodePositions.length; j++) {
          const dx = nodePositions[i].x - nodePositions[j].x;
          const dy = nodePositions[i].y - nodePositions[j].y;
          const dz = nodePositions[i].z - nodePositions[j].z;
          if (dx * dx + dy * dy + dz * dz < maxDistSq) {
            lineIndices.push(i, j);
            conns++;
          }
          if (conns > 3) break;
        }
      }
      const linesGeo = new THREE.BufferGeometry();
      linesGeo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3)
      );
      linesGeo.setIndex(lineIndices);
      const linesMat = new THREE.LineBasicMaterial({
        color: 0x22c55e,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending,
      });
      const lineSystem = new THREE.LineSegments(linesGeo, linesMat);
      treeGroup.add(lineSystem);

      // central glow
      const glowGeo = new THREE.SphereGeometry(15, 32, 32);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0x16a34a,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const glowSphere = new THREE.Mesh(glowGeo, glowMat);
      glowSphere.position.set(0, 5, 0);
      treeGroup.add(glowSphere);

      // ---------- active nodes (yellow cluster around written keywords) ----------
      // deterministic keyword → node index
      function kwNodeIdx(label: string) {
        let h = 2166136261 >>> 0;
        for (let i = 0; i < label.length; i++) {
          h ^= label.charCodeAt(i);
          h = Math.imul(h, 16777619);
        }
        return (h >>> 0) % nodePositions.length;
      }

      const activeNodes = new Set<number>();
      const ACTIVE_RADIUS_SQ = 6 * 6;
      for (const kw of keywords) {
        if (kw.count <= 0) continue;
        const ci = kwNodeIdx(kw.label);
        const cp = nodePositions[ci];
        for (let i = 0; i < nodePositions.length; i++) {
          const dx = nodePositions[i].x - cp.x;
          const dy = nodePositions[i].y - cp.y;
          const dz = nodePositions[i].z - cp.z;
          if (dx * dx + dy * dy + dz * dz < ACTIVE_RADIUS_SQ) activeNodes.add(i);
        }
      }

      // yellow point overlay for active nodes
      const yellowPointArr: number[] = [];
      activeNodes.forEach((idx) => {
        const p = nodePositions[idx];
        yellowPointArr.push(p.x, p.y, p.z);
      });
      const yellowPointGeo = new THREE.BufferGeometry();
      yellowPointGeo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(yellowPointArr, 3)
      );
      const yellowPointMat = new THREE.PointsMaterial({
        color: 0xfbbf24,
        size: 0.95,
        map: circleTexture,
        transparent: true,
        opacity: 0.95,
        alphaTest: 0.1,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const yellowPoints = new THREE.Points(yellowPointGeo, yellowPointMat);
      treeGroup.add(yellowPoints);

      // yellow line overlay — edges where at least one endpoint is active
      const yellowLineIndices: number[] = [];
      for (let k = 0; k < lineIndices.length; k += 2) {
        const a = lineIndices[k];
        const b = lineIndices[k + 1];
        if (activeNodes.has(a) || activeNodes.has(b)) {
          yellowLineIndices.push(a, b);
        }
      }
      const yellowLineGeo = new THREE.BufferGeometry();
      yellowLineGeo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3)
      );
      yellowLineGeo.setIndex(yellowLineIndices);
      const yellowLineMat = new THREE.LineBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
      });
      const yellowLines = new THREE.LineSegments(yellowLineGeo, yellowLineMat);
      treeGroup.add(yellowLines);

      // ---------- keyword sprites (highlight active = used in posts) ----------
      type Entry = {
        sprite: InstanceType<typeof THREE.Sprite>;
        active: boolean;
        count: number;
        phase: number;
      };
      const entries: Entry[] = [];
      const maxCount = Math.max(1, ...keywords.map((k) => k.count));

      function createSprite(text: string, active: boolean, count: number) {
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 64;
        const c = canvas.getContext("2d")!;
        c.textAlign = "center";
        c.textBaseline = "middle";
        if (active) {
          const strength = Math.min(1, count / maxCount);
          c.font = 'bold 22px "JetBrains Mono", monospace, sans-serif';
          c.fillStyle = "#fde68a"; // amber-200
          c.shadowColor = "#fbbf24"; // amber-400
          c.shadowBlur = 12 + strength * 10;
        } else {
          c.font = 'bold 19px "JetBrains Mono", monospace, sans-serif';
          c.fillStyle = "#86efac"; // green-300
          c.shadowColor = "#22c55e";
          c.shadowBlur = 4;
        }
        c.fillText(text, canvas.width / 2, canvas.height / 2);
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          depthTest: false,
          opacity: active ? 0.98 : 0.42,
        });
        const sprite = new THREE.Sprite(material);
        const baseScale = active ? 7.2 : 5.6;
        sprite.scale.set(baseScale, baseScale / 4, 1);
        return sprite;
      }

      keywords.forEach((kw) => {
        const idx = kwNodeIdx(kw.label);
        const target = nodePositions[idx];
        const sprite = createSprite(kw.label, kw.count > 0, kw.count);
        const offset = target.clone().normalize().multiplyScalar(2);
        sprite.position.copy(target).add(offset);
        treeGroup.add(sprite);
        entries.push({
          sprite,
          active: kw.count > 0,
          count: kw.count,
          phase: (idx % 628) / 100,
        });
      });

      // ---------- input / responsiveness ----------
      let mouseX = 0;
      let mouseY = 0;
      let scrollPercent = 0;

      const onMouseMove = (e: MouseEvent) => {
        mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
      };
      const onScroll = () => {
        const scrollMax = document.body.scrollHeight - window.innerHeight;
        scrollPercent = scrollMax > 0 ? window.scrollY / scrollMax : 0;
      };
      const onResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onResize);

      // ---------- render loop ----------
      let raf = 0;
      const animate = () => {
        raf = requestAnimationFrame(animate);
        controls.update();

        treeGroup.rotation.y += 0.0015;
        const targetGX = baseTreeX + mouseX * 5;
        const targetGY = mouseY * 5;
        const targetGZ = scrollPercent * 60;
        treeGroup.position.x += (targetGX - treeGroup.position.x) * 0.05;
        treeGroup.position.y += (targetGY - treeGroup.position.y) * 0.05;
        treeGroup.position.z += (targetGZ - treeGroup.position.z) * 0.05;

        const pulse = 1 + Math.sin(Date.now() * 0.002) * 0.06;
        glowSphere.scale.set(pulse, pulse, pulse);

        // active keyword pulse — breathing glow
        const t = Date.now() * 0.002;
        for (const e of entries) {
          if (!e.active) continue;
          const s = 1 + 0.05 * Math.sin(t + e.phase);
          e.sprite.scale.set(7.2 * s, (7.2 / 4) * s, 1);
          (e.sprite.material as InstanceType<typeof THREE.SpriteMaterial>).opacity =
            0.85 + 0.13 * Math.sin(t + e.phase);
        }

        // yellow overlay breathing — node + edge synchronized
        const yPulse = 0.85 + 0.15 * Math.sin(t * 1.2);
        yellowPointMat.size = 0.95 * (0.95 + 0.15 * Math.sin(t * 1.3));
        yellowPointMat.opacity = yPulse;
        yellowLineMat.opacity = 0.35 + 0.25 * Math.sin(t * 1.5);

        renderer.setClearColor(0x000000, 0);
        renderer.clear();

        // --- main viewport ---
        renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
        renderer.setScissor(0, 0, window.innerWidth, window.innerHeight);
        renderer.setScissorTest(true);
        renderer.render(scene, camera);

        // --- mini-map viewport: no fog, framed to fit whole tree ---
        if (miniBox) {
          const rect = miniBox.getBoundingClientRect();
          const cw = renderer.domElement.clientWidth;
          const ch = renderer.domElement.clientHeight;
          const canvasBottom = ch - rect.bottom;
          if (
            rect.width > 0 &&
            rect.height > 0 &&
            rect.bottom >= 0 &&
            rect.top <= ch &&
            rect.right >= 0 &&
            rect.left <= cw
          ) {
            renderer.setViewport(rect.left, canvasBottom, rect.width, rect.height);
            renderer.setScissor(rect.left, canvasBottom, rect.width, rect.height);

            miniCamera.aspect = rect.width / rect.height;
            miniCamera.updateProjectionMatrix();

            // sync orientation with main camera but pull back to fit full tree
            const dir = camera.position
              .clone()
              .sub(controls.target)
              .normalize();
            miniCamera.position
              .copy(controls.target)
              .add(dir.multiplyScalar(85));
            miniCamera.lookAt(controls.target);

            // remove fog so the mini tree is crisp and clearly visible
            const savedFog = scene.fog;
            scene.fog = null;

            renderer.setClearColor(0x0b1f13, 1.0);
            renderer.clear(true, true, false);
            renderer.render(scene, miniCamera);

            scene.fog = savedFog;
          }
        }
      };
      animate();

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onResize);
        controls.dispose();
        renderer.dispose();
        particlesGeo.dispose();
        linesGeo.dispose();
        pointsMat.dispose();
        linesMat.dispose();
        yellowPointGeo.dispose();
        yellowLineGeo.dispose();
        yellowPointMat.dispose();
        yellowLineMat.dispose();
        glowGeo.dispose();
        glowMat.dispose();
        circleTexture.dispose();
        entries.forEach((e) => {
          const m = e.sprite.material as InstanceType<
            typeof THREE.SpriteMaterial
          >;
          if (m.map) m.map.dispose();
          m.dispose();
        });
        if (renderer.domElement.parentNode === container) {
          container.removeChild(renderer.domElement);
        }
      };
    })();

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
    };
  }, [keywords]);

  return (
    <>
      <div
        ref={bgRef}
        aria-hidden
        className="fixed inset-0 -z-20"
        style={{ background: "#020e06" }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at center, transparent 20%, #020e06 120%)",
        }}
      />
      <aside className="fixed right-3 top-24 z-20 w-[180px] overflow-hidden rounded-xl border border-white/10 bg-black/45 shadow-2xl backdrop-blur-md md:right-6 md:w-[230px]">
        <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-3 py-2">
          <div className="flex items-center gap-2 text-white/80">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"
              />
            </svg>
            <span className="font-mono text-[10px] uppercase tracking-widest">
              drag to rotate
            </span>
          </div>
        </div>
        <div
          ref={miniRef}
          className="relative h-[140px] w-full cursor-move md:h-[170px]"
        />
        <div className="border-t border-white/10 bg-black/30 px-3 py-1.5 font-mono text-[10px] text-white/60">
          <span className="text-amber-300">●</span> written
          <span className="ml-3 text-emerald-300">●</span> not yet
        </div>
      </aside>
    </>
  );
}
