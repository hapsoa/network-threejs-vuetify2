/**
 * sample data를 hash로 만든 network
 */

// tslint:disable: prefer-for-of

import { Component, Vue } from 'vue-property-decorator';
import * as THREE from 'three';
import _ from 'lodash';

import unNodesHashJson from '@/refiningData/result-directory/refinedData.json';

interface CountryCountHash {
  [country: string]: number;
}
interface CountryCountHashPerKey {
  // rcid, year(total)
  [key: string]: CountryCountHash;
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
  private camera: any = null;
  private scene: any = null;
  private renderer: any = null;

  // sample nodes, edges
  // private sampleNodesHash: { [nodeId: string]: Node } = {
  //   1: {
  //     id: '1',
  //     label: 'Allemand Pere (Marc Allemand)',
  //     x: 0,
  //     y: 0,
  //     forceX: 0,
  //     forceY: 0,
  //     neighbors: ['2', '3', '4', '5']
  //   },
  //   2: {
  //     id: '2',
  //     label: 'Etienne Allemand',
  //     x: 0,
  //     y: 0,
  //     forceX: 0,
  //     forceY: 0,
  //     neighbors: ['1', '3', '4']
  //   },
  //   3: {
  //     id: '3',
  //     label: 'Marie Giraud',
  //     x: 0,
  //     y: 0,
  //     forceX: 0,
  //     forceY: 0,
  //     neighbors: []
  //   },
  //   4: {
  //     id: '4',
  //     label: 'Elizabeth Glaumont',
  //     x: 0,
  //     y: 0,
  //     forceX: 0,
  //     forceY: 0,
  //     neighbors: ['1', '3']
  //   },
  //   5: {
  //     id: '5',
  //     label: 'Louis Merceron',
  //     x: 0,
  //     y: 0,
  //     forceX: 0,
  //     forceY: 0,
  //     neighbors: ['1']
  //   }
  // };
  private unNodesHash: {
    [nodeId: string]: Node
  } = _.cloneDeep(unNodesHashJson);

  private sampleNodeMeshes: THREE.Mesh[] = [];
  private sampleEdgeMeshes: THREE.Line[] = [];
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

    _.forEach(this.unNodesHash, node => {
      const nodeMesh = new THREE.Mesh(nodeGeometry, material);
      this.sampleNodeMeshes.push(nodeMesh);
      node.x = Math.random() * 20 - 10;
      nodeMesh.position.x = node.x;
      node.y = Math.random() * 20 - 10;
      nodeMesh.position.y = node.y;
      this.scene.add(nodeMesh);

      const text = this._createTextLabel(container);
      text.setHTML(node.label);
      text.setParent(nodeMesh);
      this.textlabels.push(text);
      container.appendChild(text.element);
    });

    // edge 그리기
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff
    });

    _.forEach(this.unNodesHash, node => {
      _.forEach(node.neighbors.total, (similarity, neighbor) => {
        if (node.id <= neighbor) {
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
    });

    // renderer는 그리기 객체이다.
    this.renderer = new THREE.WebGLRenderer({
      antialias: true
    });

    // renderer의 크기를 설정한다. 화면 크기를 설정한다고 볼 수 있겠다.
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);
  }

  /**
   * 애니메이션을 주는 함수이다.
   */
  private animate() {
    // 다음 프레임때 animate()함수를 실행시키는 함수인듯
    requestAnimationFrame(this.animate);

    // initialize net forces
    _.forEach(this.unNodesHash, node => {
      node.forceX = 0;
      node.forceY = 0;
    });

    // repulsion between all pairs
    const sampleNodesHashKeys = Object.keys(this.unNodesHash);
    // for (let i = 0; i < this.sampleNodes.length - 1; i++) {
    for (let i = 0; i < sampleNodesHashKeys.length - 1; i++) {
      const node1Id = sampleNodesHashKeys[i];
      const node1 = this.unNodesHash[node1Id];
      for (let j = i + 1; j < sampleNodesHashKeys.length; j++) {
        const node2Id = sampleNodesHashKeys[j];
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

    // }

    // spring force between adjacent pairs
    for (let i = 0; i < sampleNodesHashKeys.length; i++) {
      const node1Id = sampleNodesHashKeys[i];
      const node1 = this.unNodesHash[node1Id];
      // for (let j = 0; j < node1.neighbors.length; j++) {
      _.forEach(node1.neighbors.total, (similarity, neighbor) => {
        // const i2 = node1.neighbors[j];
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

      // }
    }

    // update positions
    for (let i = 0; i < sampleNodesHashKeys.length; i++) {
      const nodeId = sampleNodesHashKeys[i];
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

      // 각 edge마다 point를 바꿔줘야 한다.
    }

    let m = 0;
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < sampleNodesHashKeys.length; i++) {
      const nodeId = sampleNodesHashKeys[i];
      const node = this.unNodesHash[nodeId];
      console.log('node', node);
      _.forEach(node.neighbors.total, (similarity, neighbor) => {
        if (node.id <= neighbor) {
          // edge의 point의 위치를 조정한다.
          this.sampleEdgeMeshes[m].geometry.setFromPoints([
            new THREE.Vector3(node.x, node.y, 0),
            new THREE.Vector3(
              this.unNodesHash[neighbor].x,
              this.unNodesHash[neighbor].y,
              0
            )
          ]);
          m++;
        }
      });
    }

    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < this.textlabels.length; i++) {
      this.textlabels[i].updatePosition();
    }

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
