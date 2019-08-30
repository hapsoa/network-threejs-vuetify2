/**
 * sample data를 hash로 만든 network
 */

// tslint:disable: prefer-for-of

import { Component, Vue } from 'vue-property-decorator';
import * as THREE from 'three';
import _ from 'lodash';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';

import unNodesHashJson from '@/refiningData/result-directory/refinedData.json';
// import unNodesHashJson from '@/refiningData/result-directory/allRefinedData.json';
import yearWeightHashJson from '@/refiningData/yearWeightHashDirectory/yearWeightHash.json';

interface CountryCountHash {
  [country: string]: number;
}
interface CountryCountHashPerKey {
  // rcid, year(total)
  [key: string]: CountryCountHash;
}
interface CountryByCountryCountHash {
  [country: string]: CountryCountHash;
}

interface Node {
  id: string; // Country
  label: string; // Countryname
  x: number;
  y: number;
  forceX: number;
  forceY: number;
  neighbors: CountryCountHashPerKey;
}

@Component({
  components: {
    //
  }
})
export default class Home extends Vue {
  private camera!: THREE.PerspectiveCamera;
  private scene: any = null;
  private renderer: any = null;
  private tick: number = 0;

  // camera controls
  private controls!: OrbitControls;

  private unNodesHash: {
    [nodeId: string]: Node;
  } = _.cloneDeep(unNodesHashJson);
  private yearWeightHash: CountryByCountryCountHash = _.cloneDeep(
    yearWeightHashJson
  );

  private sampleNodeMeshes: THREE.Mesh[] = [];
  private edgeGeometries: LineGeometry[] = [];
  private edgeMeshes: Line2[] = [];
  private textlabels: any[] = [];

  // force-directed variables
  private restLength: number = 50;
  private kRepulsive: number = 6250;
  private kSpring: number = 1;
  private deltaT: number = 0.04;
  private MAX_DISPLACEMENT_SQUARED: number = 100;

  /**
   * Three.js 초기화 함수이다.
   */
  private init() {
    const container = document.getElementById('container') as HTMLElement;

    // 카메라 생성 (fov: 시야각. 시야가 좁아지면 확대되어 보임, aspect: 종횡비, near: 어느시점부터 보이기, far: 어디까지 보이기)
    this.camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.01,
      2000
    );
    this.camera.position.z = 150;
    // orbitControl 상하 이동을 변경하기위해 카메라 up 벡터를 조정한다.
    this.camera.up = new THREE.Vector3(0, 0, 1);

    // 화면인듯. 화면 생성
    this.scene = new THREE.Scene();

    // 네트워크 물체들을 생성한다 (node, edge)
    // 물체의 구조정보
    const nodeGeometry = new THREE.CircleGeometry(1, 20);

    // 일반 그리기 방법인듯
    const material = new THREE.MeshBasicMaterial();
    material.color.setHex(0xefefef);

    _.forEach(this.unNodesHash, node => {
      const nodeMesh = new THREE.Mesh(nodeGeometry, material);
      this.sampleNodeMeshes.push(nodeMesh);
      node.x = Math.random() * 200 - 100;
      nodeMesh.position.x = node.x;
      node.y = Math.random() * 200 - 100;
      nodeMesh.position.y = node.y;
      this.scene.add(nodeMesh);

      const text = this._createTextLabel(container);
      text.setHTML(node.label);
      text.setParent(nodeMesh);
      this.textlabels.push(text);
      container.appendChild(text.element);
    });

    // edge 그리기
    _.forEach(this.unNodesHash, node => {
      _.forEach(node.neighbors.total, (similarity, neighbor) => {
        if (node.id <= neighbor) {
          let color: number = 0x000000;
          const yearWeight = this.yearWeightHash[node.id][neighbor];
          if (yearWeight > 0) {
            color = 0xffff00 + 0xff * yearWeight;
          } else if (yearWeight < 0) {
            color = 0x00ffff + 0xff * yearWeight;
          } else {
            color = 0x00ff00;
          }
          // edge를 추가한다.
          const geometry = new LineGeometry();
          const lineMaterial = new LineMaterial({
            color,
            linewidth: similarity
          });
          lineMaterial.resolution.set(
            container.clientWidth,
            container.clientHeight
          );

          const line = new Line2(geometry, lineMaterial);
          this.edgeGeometries.push(geometry);
          this.edgeMeshes.push(line);

          this.scene.add(line);
        }
      });
    });

    // renderer는 그리기 객체이다.
    this.renderer = new THREE.WebGLRenderer({
      antialias: true
    });

    // renderer의 크기를 설정한다. 화면 크기를 설정한다고 볼 수 있겠다.
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    // camera controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableRotate = false;
  }

  /**
   * 애니메이션을 주는 함수이다.
   */
  private animate() {
    // 다음 프레임때 animate()함수를 실행시키는 함수인듯
    requestAnimationFrame(this.animate);
    // console.log('tick', this.tick);
    if (this.tick < 100) {
      // initialize net forces
      _.forEach(this.unNodesHash, node => {
        node.forceX = 0;
        node.forceY = 0;
      });

      // repulsion between all pairs
      const nodesHashKeys = Object.keys(this.unNodesHash);
      for (let i = 0; i < nodesHashKeys.length - 1; i++) {
        const node1Id = nodesHashKeys[i];
        const node1 = this.unNodesHash[node1Id];
        for (let j = i + 1; j < nodesHashKeys.length; j++) {
          const node2Id = nodesHashKeys[j];
          const node2 = this.unNodesHash[node2Id];
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
      for (let i = 0; i < nodesHashKeys.length; i++) {
        const node1Id = nodesHashKeys[i];
        const node1 = this.unNodesHash[node1Id];
        _.forEach(node1.neighbors.total, (similarity, neighbor) => {
          const node2 = this.unNodesHash[neighbor];

          if (node1.id < node2.id) {
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
        });
      }

      // update positions
      for (let i = 0; i < nodesHashKeys.length; i++) {
        const nodeId = nodesHashKeys[i];
        const node = this.unNodesHash[nodeId];
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
      }

      // 각 edge마다 point를 바꿔줘야 한다.
      let m = 0;
      for (let i = 0; i < nodesHashKeys.length; i++) {
        const nodeId = nodesHashKeys[i];
        const node = this.unNodesHash[nodeId];
        _.forEach(node.neighbors.total, (similarity, neighbor) => {
          if (node.id <= neighbor) {
            // edge의 point의 위치를 조정한다.
            this.edgeGeometries[m].setPositions([
              node.x,
              node.y,
              0,
              this.unNodesHash[neighbor].x,
              this.unNodesHash[neighbor].y,
              0
            ]);
            // this.edgeMeshes[m].geometry = this.edgeMeshes[
            //   m
            // ].geometry.setFromPoints([
            //   new THREE.Vector3(node.x, node.y, 0),
            //   new THREE.Vector3(
            //     this.unNodesHash[neighbor].x,
            //     this.unNodesHash[neighbor].y,
            //     0
            //   )
            // ]);

            m++;
          }
        });
      }
    }

    // 노드에 text label의 위치를 업데이트 한다.
    for (let i = 0; i < this.textlabels.length; i++) {
      this.textlabels[i].updatePosition();
    }

    this.tick++;

    // renderer가 scene과 camera를 가지고 그린다.
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * node에 text를 붙이는 함수이다.
   * @param container : Three.js를 포함하는 HTML div 태그 객체
   */
  private _createTextLabel(container: HTMLElement) {
    const div = document.createElement('div');
    div.className = 'text-label';
    div.style.position = 'absolute';
    div.style.width = '100px';
    div.style.height = '100px';
    div.innerHTML = 'hi there!';
    div.style.top = '-1000px';
    div.style.left = '-1000px';
    div.style.color = '#ffffff';

    const _this = this;

    return {
      element: div,
      parent: false,
      position: new THREE.Vector3(0, 0, 0),
      // label을 지정하는 함수
      setHTML(html: string) {
        this.element.innerHTML = html;
      },
      // mesh단위로 parent를 붙이는듯
      setParent(threejsobj) {
        this.parent = threejsobj;
      },
      // 매 tick마다 해당 text의 위치를 업데이트한다.
      updatePosition() {
        if (parent) {
          // @ts-ignore
          this.position.copy(this.parent.position);
        }

        const coords2d = this.get2DCoords(this.position, _this.camera);
        this.element.style.left = coords2d.x + 'px';
        this.element.style.top = coords2d.y + 'px';
      },
      get2DCoords(position, camera) {
        const vector = position.project(camera);
        vector.x = ((vector.x + 1) / 2) * container.clientWidth;
        vector.y = (-(vector.y - 1) / 2) * container.clientHeight;
        return vector;
      }
    };
  }

  private mounted() {
    this.init();
    this.animate();
  }
}
