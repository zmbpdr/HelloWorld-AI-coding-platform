/**
 * main.tsx - 应用入口
 *
 * React 应用启动入口，将根组件 App 挂载到 DOM 节点上。
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

/** 将 App 组件渲染到 index.html 中 id 为 root 的 DOM 节点 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
