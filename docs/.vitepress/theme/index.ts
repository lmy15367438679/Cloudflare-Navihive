import DefaultTheme from 'vitepress/theme';
import './style.css';

export default {
  extends: DefaultTheme,
  enhanceApp() {
    // 可以在这里注册全局组件（VitePress 会向 enhanceApp 传入 { app, router, siteData }）
  },
};
