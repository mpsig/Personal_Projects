import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Between the Lines · Book Discussion',description:'Read enough to start a meaningful conversation.'};
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
