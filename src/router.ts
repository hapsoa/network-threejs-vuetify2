import Vue from 'vue';
import Router from 'vue-router';
import Home from './views/Home';

Vue.use(Router);

export default new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    // 일반 force-directed network
    {
      path: '/',
      name: 'home',
      component: Home
    },
    // hash data로 force-directed network
    {
      path: '/hashdata-network',
      name: 'hashdata-network',
      component: () => import('./views/HashDataNetwork')
    },
    // un data로 force-directed graph 테스트
    {
      path: '/unnetwork-test',
      name: 'unnetwork-test',
      component: () => import('./views/HashDataNetwork')
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (about.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () =>
        import(/* webpackChunkName: "about" */ './views/About.vue')
    }
  ]
});
