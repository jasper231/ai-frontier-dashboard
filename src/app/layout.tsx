import type { Metadata, Viewport } from 'next';
import { bootstrapScript } from '@/lib/news/bootstrap.cjs';
import { dictionary } from '@/lib/news/i18n.cjs';
import './globals.css';
const copy=dictionary('zh');
export const viewport: Viewport={width:'device-width',initialScale:1,viewportFit:'cover'};
export const metadata: Metadata={title:copy.pageTitle,description:copy.description,icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>){
 return <html lang="zh-CN" suppressHydrationWarning><head><script id="frontier-preferences" dangerouslySetInnerHTML={{__html:bootstrapScript()}}/><noscript><style>{'html[data-frontier-pending] #dashboard-root{visibility:visible}'}</style></noscript></head><body>{children}</body></html>;
}
