/**
 * sample data를 hash로 만든 network
 */

// tslint:disable: prefer-for-of

import { Component, Vue } from 'vue-property-decorator';
import * as THREE from 'three';
import _ from 'lodash';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

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
export default class UnBufferGeometryTest extends Vue {
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

  private textlabels: any[] = [];

  // BufferGeometry를 위한 변수들
  private nodeMesh!: THREE.Mesh;
  private edgeMesh!: THREE.Mesh;

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
    // node를 생성한다.
    const nodeBufferGeometry = new THREE.BufferGeometry();
    const nodeVertices: number[] = [];
    const nodeIndices: number[] = [];

    // vertices를 넣는다.
    let i: number = 0;
    _.forEach(this.unNodesHash, node => {
      node.x = Math.random() * 200 - 100;
      node.y = Math.random() * 200 - 100;

      const halfWidth: number = 1;
      nodeVertices.push(node.x - halfWidth, node.y + halfWidth, 0);
      nodeVertices.push(node.x + halfWidth, node.y + halfWidth, 0);
      nodeVertices.push(node.x - halfWidth, node.y - halfWidth, 0);
      nodeVertices.push(node.x + halfWidth, node.y - halfWidth, 0);

      // nodeIndices.push(0, 1, 2, 1, 3, 2);
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
    // const material = new THREE.MeshPhongMaterial({
    //   color: 0xaaaaaa,
    //   specular: 0xffffff,
    //   shininess: 250,
    //   side: THREE.DoubleSide,
    //   vertexColors: THREE.VertexColors
    // });
    // material.color.r = 0;
    this.nodeMesh = new THREE.Mesh(nodeBufferGeometry, nodeMaterial);
    this.scene.add(this.nodeMesh);

    // edge를 생성한다
    const edgeBufferGeometry = new THREE.BufferGeometry();
    const edgeVertices: number[] = [];
    const edgeIndices: number[] = [];
    const edgeColors: number[] = [];
    const color = new THREE.Color();

    const nodesHashKeys = Object.keys(this.unNodesHash).sort();
    let m = 0;
    for (let k = 0; k < nodesHashKeys.length; k++) {
      const nodeId = nodesHashKeys[k];
      const node = this.unNodesHash[nodeId];
      _.forEach(node.neighbors.total, (similarity, neighbor) => {
        if (node.id <= neighbor) {
          const neighborNode = this.unNodesHash[neighbor];

          let hexColor: number = 0x000000;
          const yearWeight = this.yearWeightHash[node.id][neighbor];
          if (yearWeight > 0) {
            hexColor = 0xffff00 + 0xff * yearWeight;
          } else if (yearWeight < 0) {
            hexColor = 0x00ffff + 0xff * yearWeight;
          } else {
            hexColor = 0x00ff00;
          }
          color.setHex(hexColor);
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
          // TODO 수직벡터 계산해서 정확한 edge를 그려야 한다.
          // 벡터 생성
          const vector: number[] = [
            neighborNode.x - node.x,
            neighborNode.y - node.y
          ];

          edgeIndices.push(m, m + 1, m + 2);
          edgeIndices.push(m + 3, m + 1, m + 2);

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

    this.edgeMesh = new THREE.Mesh(edgeBufferGeometry, edgeMaterial);
    this.scene.add(this.edgeMesh);

    // renderer는 그리기 객체이다.
    this.renderer = new THREE.WebGLRenderer({
      antialias: true
    });

    // renderer의 크기를 설정한다. 화면 크기를 설정한다고 볼 수 있겠다.
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    // camera controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    // this.controls.enableRotate = false;
  }

  /**
   * 애니메이션을 주는 함수이다.
   */
  private animate() {
    // 다음 프레임때 animate()함수를 실행시키는 함수인듯
    requestAnimationFrame(this.animate);

    this.tick++;

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
          ) as THREE.BufferAttribute).setXY(m + 1, node.x, node.y - halfWidth);
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

    ((this.nodeMesh.geometry as THREE.BufferGeometry).attributes
      .position as THREE.BufferAttribute).needsUpdate = true;
    ((this.edgeMesh.geometry as THREE.BufferGeometry).attributes
      .position as THREE.BufferAttribute).needsUpdate = true;

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
      setHTML(html) {
        this.element.innerHTML = html;
      },
      setParent(threejsobj) {
        this.parent = threejsobj;
      },
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
