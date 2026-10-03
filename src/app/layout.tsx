import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'AI Frontier — 个人前沿观察台', description: 'AI、智能体、芯片、机器人与加密技术的个人前沿观察台。包含 15 条本地示例内容。', icons: { icon: '/favicon.svg' } };
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) { return <html lang="zh-CN"><body>{children}</body></html>; }
