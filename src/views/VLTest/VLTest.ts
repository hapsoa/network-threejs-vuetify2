import Vue from 'vue';
import { Component, Watch, Prop } from 'vue-property-decorator';
import VL from '@/vl';

@Component({
  components: {}
})
export default class Template extends Vue {
  //
  private vl: any = null;
  private mounted() {
    const container: HTMLElement = document.getElementById(
      'container'
    ) as HTMLElement;
    const vl = new VL(container);
    console.log('template');
  }
}
