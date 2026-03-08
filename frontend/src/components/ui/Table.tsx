'use client';

export function Table({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border dark:border-dark-border">
      <table className={`w-full border-collapse ${className}`}>{children}</table>
    </div>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-surface-muted dark:bg-dark-surface-muted">
      <tr>{children}</tr>
    </thead>
  );
}

export function TableHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`text-left text-xs font-medium text-text-muted dark:text-dark-text-muted uppercase tracking-wider px-4 py-3 ${className}`}
    >
      {children}
    </th>
  );
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-border dark:divide-dark-border">{children}</tbody>;
}

export function TableRow({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <tr
      className={`hover:bg-surface-hover dark:hover:bg-dark-surface-hover transition-colors ${className}`}
    >
      {children}
    </tr>
  );
}

export function TableCell({
  children,
  className = '',
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <td title={title} className={`px-4 py-3 text-sm text-text-primary dark:text-dark-text ${className}`}>
      {children}
    </td>
  );
}
