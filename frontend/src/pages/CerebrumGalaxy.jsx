import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { cerebrum } from '../services/api';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LoadingState, ErrorState } from '../components/StateComponents';
import { Sparkles, Activity, AlertTriangle, ArrowRight } from 'lucide-react';

export default function CerebrumGalaxy() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [board, setBoard] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [hoveredProject, setHoveredProject] = useState(null);
  const statsRef = useRef({});

  useEffect(() => {
    fetchData();
    return () => {
      if (sceneRef.current) {
        sceneRef.current.animationId && cancelAnimationFrame(sceneRef.current.animationId);
        sceneRef.current.renderer?.dispose();
        sceneRef.current = null;
      }
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await cerebrum.getOracle();
      const projects = res.data.projects || [];
      setBoard(projects);
      statsRef.current = res.data.stats || {};
      setTimeout(() => initGalaxy(projects), 100);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load galaxy data');
      setLoading(false);
    }
  };

  function initGalaxy(projects) {
    if (!containerRef.current) { setLoading(false); return; }

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a14);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 2, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.8;
    controls.minDistance = 3;
    controls.maxDistance = 20;

    const ambientLight = new THREE.AmbientLight(0x222244, 0.5);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    const starFieldGeometry = new THREE.BufferGeometry();
    const starCount = 500;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) starPositions[i] = (Math.random() - 0.5) * 50;
    starFieldGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0x444466, size: 0.03, transparent: true, opacity: 0.6 });
    scene.add(new THREE.Points(starFieldGeometry, starMaterial));

    const projectMap = {};
    const projectMeshes = [];
    const connections = [];

    projects.forEach((v, i) => {
      if (!v.projectId) return;
      const score = v.score || 50;
      const angle = (i / projects.length) * Math.PI * 2 + Math.random() * 0.2;
      const radius = 2 + Math.random() * 1.5;
      const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 0.5;
      const z = Math.sin(angle) * radius + (Math.random() - 0.5) * 0.5;
      const y = (Math.random() - 0.5) * 1;

      const hue = score > 70 ? 0.3 : score > 45 ? 0.15 : score > 25 ? 0.08 : 0;
      const saturation = 0.8;
      const lightness = 0.5 + (score / 100) * 0.3;
      const color = new THREE.Color().setHSL(hue, saturation, lightness);

      const size = 0.12 + (score / 100) * 0.2;
      const geometry = new THREE.SphereGeometry(size, 12, 12);
      const material = new THREE.MeshPhongMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.9,
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(x, y, z);
      sphere.userData = { projectId: v.projectId._id || v.projectId, score, name: v.projectId.name || 'Unknown', index: i, viability: v };
      scene.add(sphere);
      projectMeshes.push(sphere);
      projectMap[v.projectId._id || v.projectId] = sphere;

      if (score < 30) {
        const ringGeo = new THREE.RingGeometry(size * 1.5, size * 1.8, 24);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xff4444, side: THREE.DoubleSide, transparent: true, opacity: 0.3 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(x, y, z);
        ring.userData = { parent: sphere };
        ring.lookAt(camera.position);
        scene.add(ring);

        const pulseGeo = new THREE.RingGeometry(size * 2, size * 2.2, 24);
        const pulseMat = new THREE.MeshBasicMaterial({ color: 0xff4444, side: THREE.DoubleSide, transparent: true, opacity: 0.15 });
        const pulseRing = new THREE.Mesh(pulseGeo, pulseMat);
        pulseRing.position.set(x, y, z);
        pulseRing.userData = { parent: sphere, phase: Math.random() * Math.PI * 2 };
        scene.add(pulseRing);
      }
    });

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x4444aa,
      transparent: true,
      opacity: 0.08,
    });

    for (let i = 0; i < projectMeshes.length; i++) {
      for (let j = i + 1; j < projectMeshes.length; j++) {
        if (Math.random() > 0.3) continue;
        const p1 = projectMeshes[i];
        const p2 = projectMeshes[j];
        const points = [p1.position.clone(), p2.position.clone()];
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geo, lineMaterial);
        scene.add(line);
        connections.push(line);
      }
    }

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let selectedObject = null;

    const onMouseClick = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(projectMeshes);
      if (intersects.length > 0) {
        const obj = intersects[0].object;
        const v = obj.userData.viability;
        setSelectedProject(v || { projectId: { _id: obj.userData.projectId, name: obj.userData.name }, score: obj.userData.score });
        controls.autoRotate = false;
        if (selectedObject) {
          selectedObject.material.emissiveIntensity = 0.3;
        }
        selectedObject = obj;
        obj.material.emissiveIntensity = 0.8;
      } else {
        setSelectedProject(null);
        controls.autoRotate = true;
        if (selectedObject) { selectedObject.material.emissiveIntensity = 0.3; selectedObject = null; }
      }
    };

    const onMouseMove = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(projectMeshes);
      if (intersects.length > 0) {
        const obj = intersects[0].object;
        document.body.style.cursor = 'pointer';
        setHoveredProject(obj.userData.name);
      } else {
        document.body.style.cursor = 'default';
        setHoveredProject(null);
      }
    };

    renderer.domElement.addEventListener('click', onMouseClick);
    renderer.domElement.addEventListener('mousemove', onMouseMove);

    const clock = new THREE.Clock();
    let animId;

    function animate() {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      scene.children.forEach(child => {
        if (child.isMesh && child.geometry.type === 'RingGeometry' && child.userData.parent) {
          const phase = child.userData.phase || 0;
          const scale = 1 + Math.sin(elapsed * 2 + phase) * 0.3;
          child.scale.set(scale, scale, scale);
          child.material.opacity = 0.15 + Math.sin(elapsed * 2 + phase) * 0.1;
          child.lookAt(camera.position);
        }
      });

      controls.update();
      renderer.render(scene, camera);
    }

    animate();

    window.addEventListener('resize', () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });

    sceneRef.current = {
      renderer,
      camera,
      scene,
      controls,
      animationId: animId,
      dispose: () => {
        cancelAnimationFrame(animId);
        renderer.domElement.removeEventListener('click', onMouseClick);
        renderer.domElement.removeEventListener('mousemove', onMouseMove);
        renderer.dispose();
      }
    };
    setLoading(false);
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="page-enter" style={{ position: 'relative', width: '100%', height: 'calc(100vh - 48px)', overflow: 'hidden' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      <div style={{ position: 'absolute', top: 20, left: 24, zIndex: 10, pointerEvents: 'none' }}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <div className="text-lg font-bold text-white drop-shadow-lg">Neural Map</div>
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5 drop-shadow-lg">Rotate · Zoom · Click a star to inspect</div>
      </div>

      {hoveredProject && (
        <div style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', zIndex: 10, pointerEvents: 'none' }}>
          <div className="px-4 py-2 rounded-xl text-sm text-white" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}>
            {hoveredProject}
          </div>
        </div>
      )}

      {selectedProject && (
        <div style={{ position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 10, width: 360 }}>
          <div className="rounded-xl p-4" style={{ background: 'rgba(10,10,20,0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-white">{selectedProject.projectId?.name || 'Unknown'}</span>
              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                selectedProject.score > 70 ? 'bg-green-500/15 text-green-400' :
                selectedProject.score > 45 ? 'bg-yellow-500/15 text-yellow-400' :
                selectedProject.score > 25 ? 'bg-orange-500/15 text-orange-400' : 'bg-red-500/15 text-red-400'
              }`}>
                {selectedProject.score}/100
              </span>
            </div>
            {selectedProject.earlySignals?.length > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] text-orange-400 mb-2">
                <AlertTriangle className="w-3 h-3" />
                {selectedProject.earlySignals.filter(s => !s.resolved).length} active warnings
              </div>
            )}
            <button onClick={() => navigate(`/cerebrum/oracle/${selectedProject.projectId?._id}`)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg text-white border-none cursor-pointer transition-all"
              style={{ background: 'linear-gradient(135deg, var(--brand-primary), #6366f1)' }}>
              Open Oracle <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      <div style={{ position: 'absolute', bottom: 20, right: 24, zIndex: 10, pointerEvents: 'none' }}>
        <div className="flex items-center gap-3 text-[10px] text-slate-600">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Healthy</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Caution</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Critical</span>
        </div>
      </div>
    </div>
  );
}
