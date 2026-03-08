import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';

export const metadata = {
  title: 'Claw Admin',
  description: 'Unified control plane for desktop + web: logs, SSO, LLM, Skills, MCP.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="bg-page text-text-primary dark:bg-dark-bg dark:text-dark-text">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
