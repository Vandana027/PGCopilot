import './globals.css';

export const metadata = { title: 'PGCopilot — Simple PG Management', description: 'Owner-first PG management SaaS prototype' };

export default function RootLayout({ children }:{children:React.ReactNode}){
  return <html lang="en"><body>{children}</body></html>;
}
