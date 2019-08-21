/**
 * 기본 Three.js + vue
 */

import { Component, Vue } from 'vue-property-decorator';
import * as THREE from 'three';
import _ from 'lodash';

import marriageContractData from './marriageContractData.json';

@Component({
  components: {
    //
  }
})
export default class Home extends Vue {
  private camera: any = null;
  private scene: any = null;
  private renderer: any = null;

  // test mesh
  private mesh: null | THREE.Mesh = null;
  private mesh2: null | THREE.Mesh = null;
  private mesh3: null | THREE.Mesh = null;
  private meshes: THREE.Mesh[] = [];

  // sample nodes, edges
  private sampleNodes = [
    {
      // ID: '1',
      Label: 'Allemand Pere (Marc Allemand)',
      x: 0,
      y: 0,
      forceX: 0,
      forceY: 0,
      neighbors: [1, 2, 3, 4]
    },
    {
      // ID: '2',
      Label: 'Etienne Allemand',
      x: 0,
      y: 0,
      forceX: 0,
      forceY: 0,
      neighbors: [0, 3, 4]
    },
    {
      // ID: '3',
      Label: 'Marie Giraud',
      x: 0,
      y: 0,
      forceX: 0,
      forceY: 0,
      neighbors: []
    },
    {
      // ID: '4',
      Label: 'Elizabeth Glaumont',
      x: 0,
      y: 0,
      forceX: 0,
      forceY: 0,
      neighbors: [1, 4]
    },
    {
      // ID: '5',
      Label: 'Louis Merceron',
      x: 0,
      y: 0,
      forceX: 0,
      forceY: 0,
      neighbors: [0]
    }
  ];

  private sampleNodeMeshes: THREE.Mesh[] = [];
  private sampleEdgeMeshes: THREE.Line[] = [];
  private k: number = 0;

  // force-directed variables
  private restLength: number = 50;
  private kRepulsive: number = 6250;
  private kSpring: number = 1;
  private deltaT: number = 0.04;
  private MAX_DISPLACEMENT_SQUARED: number = 100;

  private init() {
    const container = document.getElementById('container') as HTMLElement;

    // 카메라 생성 (fov: 작아질수록 가까이, aspect: 화면비율, near: 어느시점부터 보이기, far: 어디까지 보이기)
    this.camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.01,
      2000
    );
    this.camera.position.z = 150;

    // 화면인듯. 화면 생성
    this.scene = new THREE.Scene();

    // 네트워크 물체들을 생성한다 (node, edge)
    // 물체의 구조정보
    const nodeGeometry = new THREE.CircleGeometry(1, 20);

    // 일반 그리기 방법인듯
    const material = new THREE.MeshBasicMaterial();
    material.color.setHex(0xefefef);

    _.forEach(this.sampleNodes, node => {
      const nodeMesh = new THREE.Mesh(nodeGeometry, material);
      this.sampleNodeMeshes.push(nodeMesh);
      node.x = Math.random() * 20 - 10;
      nodeMesh.position.x = node.x;
      node.y = Math.random() * 20 - 10;
      nodeMesh.position.y = node.y;
      this.scene.add(nodeMesh);
    });

    // edge 그리기
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff
    });

    for (let i = 0; i < this.sampleNodes.length; i++) {
      const node = this.sampleNodes[i];
      _.forEach(node.neighbors, neighbor => {
        if (i <= neighbor) {
          // edge를 추가한다.
          const edgeGeometry = new THREE.BufferGeometry();
          const positions = new Float32Array(2 * 3); // 3 vertices per point
          edgeGeometry.addAttribute(
            'position',
            new THREE.BufferAttribute(positions, 3)
          );
          edgeGeometry.setDrawRange(0, 2);

          const edgeMesh = new THREE.Line(edgeGeometry, lineMaterial);
          this.sampleEdgeMeshes.push(edgeMesh);
          // scene에 mesh를 추가한다.
          this.scene.add(edgeMesh);
        }
      });
    }

    // renderer는 그리기 객체이다.
    this.renderer = new THREE.WebGLRenderer({
      antialias: true
    });

    // renderer의 크기를 설정한다. 화면 크기를 설정한다고 볼 수 있겠다.
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);
  }
  private animate() {
    requestAnimationFrame(this.animate);

    // initialize net forces
    _.forEach(this.sampleNodes, node => {
      node.forceX = 0;
      node.forceY = 0;
    });

    // repulsion between all pairs
    for (let i = 0; i < this.sampleNodes.length - 1; i++) {
      const node1 = this.sampleNodes[i];
      for (let j = i + 1; j < this.sampleNodes.length; j++) {
        const node2 = this.sampleNodes[j];
        const dx: number = node2.x - node1.x;
        const dy: number = node2.y - node1.y;
        if (dx !== 0 || dy !== 0) {
          const distanceSquared: number = dx * dx + dy * dy;
          const distance: number = Math.sqrt(distanceSquared);
          const force: number = this.kRepulsive / distanceSquared;
          const fx: number = (force * dx) / distance;
          const fy: number = (force * dy) / distance;
          node1.forceX -= fx;
          node1.forceY -= fy;
          node2.forceX += fx;
          node2.forceY += fy;
        }
      }
    }

    // spring force between adjacent pairs
    for (let i = 0; i < this.sampleNodes.length; i++) {
      const node1 = this.sampleNodes[i];
      // tslint:disable-next-line: prefer-for-of
      for (let j = 0; j < node1.neighbors.length; j++) {
        const i2 = node1.neighbors[j];
        const node2 = this.sampleNodes[i2];

        if (i < i2) {
          const dx = node2.x - node1.x;
          const dy = node2.y - node1.y;
          if (dx !== 0 || dy !== 0) {
            const distance = Math.sqrt(dx * dx + dy * dy);
            const force = this.kSpring * (distance - this.restLength);
            const fx = (force * dx) / distance;
            const fy = (force * dy) / distance;
            node1.forceX += fx;
            node1.forceY += fy;
            node2.forceX -= fx;
            node2.forceY -= fy;
          }
        }
      }
    }

    // update positions
    for (let i = 0; i < this.sampleNodes.length; i++) {
      const node = this.sampleNodes[i];
      let dx = this.deltaT * node.forceX;
      let dy = this.deltaT * node.forceY;

      const displacementSquared = dx * dx + dy * dy;
      if (displacementSquared > this.MAX_DISPLACEMENT_SQUARED) {
        const s = Math.sqrt(
          this.MAX_DISPLACEMENT_SQUARED / displacementSquared
        );
        dx *= s;
        dy *= s;
      }
      node.x += dx;
      node.y += dy;
      this.sampleNodeMeshes[i].position.x = node.x;
      this.sampleNodeMeshes[i].position.y = node.y;

      // 각 edge마다 point를 바꿔줘야 한다.
    }

    let m = 0;
    for (let i = 0; i < this.sampleNodes.length; i++) {
      const node = this.sampleNodes[i];
      _.forEach(node.neighbors, neighbor => {
        if (i <= neighbor) {
          // edge의 point의 위치를 조정한다.

          this.sampleEdgeMeshes[m].geometry.setFromPoints([
            new THREE.Vector3(node.x, node.y, 0),
            new THREE.Vector3(
              this.sampleNodes[neighbor].x,
              this.sampleNodes[neighbor].y,
              0
            )
          ]);

          // this.sampleEdgeMeshes[m].geometry.attributes

          this.k += 0.1;
          // console.log('this.k', this.k);
          console.log('m', m);
          console.log(
            'this.sampleEdgeMeshes[m].geometry',
            this.sampleEdgeMeshes[m].geometry
          );

          m++;
        }
      });
    }

    // renderer가 scene과 camera를 가지고 그린다.
    this.renderer.render(this.scene, this.camera);
  }

  private mounted() {
    this.init();
    this.animate();
  }
}
