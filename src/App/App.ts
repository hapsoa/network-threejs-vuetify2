import Vue from 'vue';
import Component from 'vue-class-component';

@Component({
})
export default class App extends Vue {
  //
  private drawerItems = [
    { title: 'Dashboard', icon: 'mdi-view-dashboard' },
    { title: 'Photos', icon: 'mdi-image' },
    { title: 'About', icon: 'mdi-help-box' },
  ];
  private right = null;
}
