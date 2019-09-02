/**
 * sample data를 hash로 만든 network
 */

// tslint:disable: prefer-for-of

import { Component, Vue } from 'vue-property-decorator';
import * as THREE from 'three';
import _ from 'lodash';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// 작은 데이터
import unNodesHashJson from '@/refiningData/result-directory/2year-refinedUnData.json';
import yearWeightHashJson from '@/refiningData/yearWeightHashDirectory/2year-unYearWeightHash.json';

// 실데이터 (대용량)
// import yearWeightHashJson from '@/refiningData/yearWeightHashDirectory/unYearWeightHash.json';
// import unNodesHashJson from '@/refiningData/result-directory/refinedUnData.json';

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

interface TextLabel {
  element: HTMLDivElement;
  parent: TextParent | null;
  position: THREE.Vector3;
  setHTML: (html: string) => void;
  setParent: (parent: TextParent) => void;
  updatePosition: () => void;
  get2DCoords: (position: THREE.Vector3, camera: any) => THREE.Vector3;
}
interface TextParent {
  nodeBufferGeometry: THREE.BufferGeometry;
  positionIndex: number;
  nodeHalfWidth: number;
}

@Component({
  components: {
    //
  }
})
export default class UnBufferGeometryTest extends Vue {
  private container!: HTMLElement;
  // 카메라 생성 (fov: 시야각. 시야가 좁아지면 확대되어 보임, aspect: 종횡비, near: 어느시점부터 보이기, far: 어디까지 보이기)
  private camera!: THREE.PerspectiveCamera;
  // 화면 (ex. 방)
  private scene!: THREE.Scene;
  private renderer!: THREE.WebGLRenderer;
  private tick: number = 0;

  // camera controls
  private controls!: OrbitControls;

  // import해온 UN 데이터들
  private unNodesHash: {
    [nodeId: string]: Node;
  } = _.cloneDeep(unNodesHashJson);
  private yearWeightHash: CountryByCountryCountHash = _.cloneDeep(
    yearWeightHashJson
  );

  private nodeMesh!: THREE.Mesh;
  private edgeMesh!: THREE.Mesh;
  private nodeTextLabels: TextLabel[] = [];

  // force-directed variables
  private restLength: number = 50;
  private kRepulsive: number = 6250;
  private kSpring: number = 1;
  private deltaT: number = 0.04;
  private MAX_DISPLACEMENT_SQUARED: number = 100;

  /**
   * Three.js 초기화 함수이다.
   */
  private init(o: {
    unNodesHash: {
      [nodeId: string]: Node;
    };
    yearWeightHash: CountryByCountryCountHash;
  }) {
    const container = document.getElementById('container') as HTMLElement;

    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.0001,
      2000
    );
    camera.position.z = 150;
    // orbitControl 상하 이동을 변경하기위해 카메라 up 벡터를 조정한다.
    camera.up = new THREE.Vector3(0, 0, 1);

    const scene = new THREE.Scene();

    // 네트워크 물체들을 생성한다 (node, edge)
    // node를 생성한다.
    const nodeBufferGeometry = new THREE.BufferGeometry();
    const nodeVertices: number[] = [];
    const nodeIndices: number[] = [];
    const nodeTextLabels: TextLabel[] = [];

    // vertices와 indices를 넣는다.
    let i: number = 0;
    _.forEach(o.unNodesHash, node => {
      node.x = Math.random() * 200 - 100;
      node.y = Math.random() * 200 - 100;

      // node vertices 생성한다
      const nodeHalfWidth: number = 1;
      nodeVertices.push(node.x - nodeHalfWidth, node.y + nodeHalfWidth, 0);
      nodeVertices.push(node.x + nodeHalfWidth, node.y + nodeHalfWidth, 0);
      nodeVertices.push(node.x - nodeHalfWidth, node.y - nodeHalfWidth, 0);
      nodeVertices.push(node.x + nodeHalfWidth, node.y - nodeHalfWidth, 0);

      // node text 생성한다
      const text = this._createTextLabel(container);
      text.setHTML(node.label);
      text.setParent({
        nodeHalfWidth,
        nodeBufferGeometry,
        positionIndex: i
      });
      nodeTextLabels.push(text);
      container.appendChild(text.element);

      // node indices 생성한다
      nodeIndices.push(i, i + 2, i + 1, i + 1, i + 2, i + 3);
      i += 4;
    });

    nodeBufferGeometry.setIndex(nodeIndices);
    nodeBufferGeometry.addAttribute(
      'position',
      new THREE.Float32BufferAttribute(nodeVertices, 3)
    );

    const nodeMaterial = new THREE.MeshBasicMaterial();
    const edgeMaterial = new THREE.MeshBasicMaterial({
      vertexColors: THREE.VertexColors
    });
    edgeMaterial.side = THREE.DoubleSide;

    const nodeMesh = new THREE.Mesh(nodeBufferGeometry, nodeMaterial);
    scene.add(nodeMesh);

    // edge를 생성한다
    const edgeBufferGeometry = new THREE.BufferGeometry();
    const edgeVertices: number[] = [];
    const edgeIndices: number[] = [];
    const edgeColors: number[] = [];
    const color = new THREE.Color();

    const nodesHashKeys = Object.keys(o.unNodesHash).sort();
    let m = 0;
    for (let k = 0; k < nodesHashKeys.length; k++) {
      const nodeId = nodesHashKeys[k];
      const node = o.unNodesHash[nodeId];
      _.forEach(node.neighbors.total, (similarity, neighbor) => {
        if (node.id <= neighbor) {
          const neighborNode = o.unNodesHash[neighbor];

          // edge에 색상 넣기
          let r: number = 255;
          const g: number = 0;
          let b: number = 255;
          const yearWeight = o.yearWeightHash[node.id][neighbor];
          if (yearWeight < 0) {
            // r = -255 * yearWeight;
            b = 255 * (1 + yearWeight);
          } else if (yearWeight > 0) {
            // b = 255 * yearWeight;
            r = 255 * (1 - yearWeight);
          } else {
            // r = 255;
            // g = 255;
            // b = 255;
          }

          color.setRGB(r, g, b);

          edgeColors.push(color.r, color.g, color.b);
          edgeColors.push(color.r, color.g, color.b);
          edgeColors.push(color.r, color.g, color.b);
          edgeColors.push(color.r, color.g, color.b);

          // 각 노드와 neighbor마다 edge vertex들을 넣어준다
          const halfWidth: number = 0.5;

          edgeVertices.push(node.x, node.y + halfWidth, 0);
          edgeVertices.push(node.x, node.y - halfWidth, 0);
          edgeVertices.push(neighborNode.x, neighborNode.y - halfWidth, 0);
          edgeVertices.push(neighborNode.x, neighborNode.y + halfWidth, 0);

          edgeIndices.push(m, m + 1, m + 2);
          edgeIndices.push(m, m + 2, m + 3);

          // TODO 수직벡터 계산해서 정확한 edge를 그려야 한다.
          // 벡터 생성
          const vector: number[] = [
            neighborNode.x - node.x,
            neighborNode.y - node.y
          ];

          m += 4;
        }
      });
    }

    edgeBufferGeometry.setIndex(edgeIndices);
    edgeBufferGeometry.addAttribute(
      'position',
      new THREE.Float32BufferAttribute(edgeVertices, 3)
    );
    console.log('edgeColor', edgeColors);
    edgeBufferGeometry.addAttribute(
      'color',
      new THREE.Float32BufferAttribute(edgeColors, 3)
    );

    const edgeMesh = new THREE.Mesh(edgeBufferGeometry, edgeMaterial);
    scene.add(edgeMesh);

    // renderer는 그리기 객체이다.
    const renderer = new THREE.WebGLRenderer({
      antialias: true
    });

    // renderer의 크기를 설정한다. 화면 크기를 설정한다고 볼 수 있겠다.
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // camera controls
    const controls = new OrbitControls(camera, renderer.domElement);
    // controls.enableRotate = false;

    return {
      container,
      camera,
      scene,
      renderer,
      controls,
      nodeMesh,
      edgeMesh,
      nodeTextLabels
    };
  }

  /**
   * 애니메이션을 주는 함수이다.
   */
  private animate() {
    // 다음 프레임때 animate()함수를 실행시키는 함수인듯
    requestAnimationFrame(this.animate);

    this.tick++;

    if (this.tick < 30) {
      // initialize net forces
      _.forEach(this.unNodesHash, node => {
        node.forceX = 0;
        node.forceY = 0;
      });

      // repulsion between all pairs
      const nodesHashKeys = Object.keys(this.unNodesHash).sort();
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
      // update nodes position
      let m: number = 0;
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

        const halfWidth: number = 1;
        ((this.nodeMesh.geometry as THREE.BufferGeometry).getAttribute(
          'position'
        ) as THREE.BufferAttribute).setXY(
          m,
          node.x - halfWidth,
          node.y + halfWidth
        );
        ((this.nodeMesh.geometry as THREE.BufferGeometry).getAttribute(
          'position'
        ) as THREE.BufferAttribute).setXY(
          m + 1,
          node.x + halfWidth,
          node.y + halfWidth
        );
        ((this.nodeMesh.geometry as THREE.BufferGeometry).getAttribute(
          'position'
        ) as THREE.BufferAttribute).setXY(
          m + 2,
          node.x - halfWidth,
          node.y - halfWidth
        );
        ((this.nodeMesh.geometry as THREE.BufferGeometry).getAttribute(
          'position'
        ) as THREE.BufferAttribute).setXY(
          m + 3,
          node.x + halfWidth,
          node.y - halfWidth
        );
        m += 4;
      }

      // 각 edge마다 point를 바꿔줘야 한다.
      m = 0;
      for (let i = 0; i < nodesHashKeys.length; i++) {
        const nodeId = nodesHashKeys[i];
        const node = this.unNodesHash[nodeId];
        _.forEach(node.neighbors.total, (similarity, neighbor) => {
          if (node.id <= neighbor) {
            // edge의 point의 위치를 조정한다.

            const neighborNode = this.unNodesHash[neighbor];
            const halfWidth: number = 0.5;
            ((this.edgeMesh.geometry as THREE.BufferGeometry).getAttribute(
              'position'
            ) as THREE.BufferAttribute).setXY(m, node.x, node.y + halfWidth);
            ((this.edgeMesh.geometry as THREE.BufferGeometry).getAttribute(
              'position'
            ) as THREE.BufferAttribute).setXY(
              m + 1,
              node.x,
              node.y - halfWidth
            );
            ((this.edgeMesh.geometry as THREE.BufferGeometry).getAttribute(
              'position'
            ) as THREE.BufferAttribute).setXY(
              m + 2,
              neighborNode.x,
              neighborNode.y - halfWidth
            );
            ((this.edgeMesh.geometry as THREE.BufferGeometry).getAttribute(
              'position'
            ) as THREE.BufferAttribute).setXY(
              m + 3,
              neighborNode.x,
              neighborNode.y + halfWidth
            );
            m += 4;
          }
        });
      }
    }

    ((this.nodeMesh.geometry as THREE.BufferGeometry).attributes
      .position as THREE.BufferAttribute).needsUpdate = true;
    ((this.edgeMesh.geometry as THREE.BufferGeometry).attributes
      .position as THREE.BufferAttribute).needsUpdate = true;

    // 노드에 text label의 위치를 업데이트 한다.
    for (let i = 0; i < this.nodeTextLabels.length; i++) {
      this.nodeTextLabels[i].updatePosition();
    }

    // renderer가 scene과 camera를 가지고 그린다.
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * node에 text를 붙이는 함수이다.
   * @param container : Three.js를 포함하는 HTML div 태그 객체
   */
  private _createTextLabel(container: HTMLElement): TextLabel {
    const div = document.createElement('div');
    div.className = 'text-label';
    div.style.position = 'absolute';
    div.style.width = '100px';
    div.style.height = '100px';
    div.innerHTML = 'hi there!';
    div.style.top = '-1000px';
    div.style.left = '-1000px';
    div.style.color = '#ffffff';
    div.style.pointerEvents = 'none';

    const _this = this;

    return {
      element: div,
      parent: null,
      position: new THREE.Vector3(0, 0, 0),
      setHTML(html: string) {
        this.element.innerHTML = html;
      },
      setParent(parent: TextParent) {
        this.parent = parent;
      },
      updatePosition() {
        if (!_.isNil(this.parent)) {
          const positionAttribute = this.parent.nodeBufferGeometry.getAttribute(
            'position'
          );
          const positionX: number = positionAttribute.getX(
            this.parent.positionIndex
          );
          const positionY: number = positionAttribute.getY(
            this.parent.positionIndex
          );
          const positionZ: number = positionAttribute.getZ(
            this.parent.positionIndex
          );
          const newPosition = new THREE.Vector3(
            positionX,
            positionY,
            positionZ
          );
          this.position.copy(newPosition);
        }

        const coords2d = this.get2DCoords(this.position, _this.camera);
        this.element.style.left = coords2d.x + 'px';
        this.element.style.top = coords2d.y + 'px';
      },
      get2DCoords(position: THREE.Vector3, camera: THREE.PerspectiveCamera) {
        const vector = position.project(camera);
        vector.x = ((vector.x + 1) / 2) * container.clientWidth;
        vector.y = (-(vector.y - 1) / 2) * container.clientHeight;
        return vector;
      }
    };
  }

  private mounted() {
    const initedObject = this.init({
      unNodesHash: this.unNodesHash,
      yearWeightHash: this.yearWeightHash
    });
    this.container = initedObject.container;
    this.camera = initedObject.camera;
    this.scene = initedObject.scene;
    this.renderer = initedObject.renderer;
    this.controls = initedObject.controls;
    this.nodeMesh = initedObject.nodeMesh;
    this.edgeMesh = initedObject.edgeMesh;
    this.nodeTextLabels = initedObject.nodeTextLabels;

    this.animate();
  }
}
