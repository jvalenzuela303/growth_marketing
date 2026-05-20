/**
 * Edit layout — overrides the dashboard shell.
 * The quiz builder is a full-screen experience: no sidebar, no header,
 * no dashboard padding. The toolbar is rendered by the page itself.
 */
export default function EditLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 flex flex-col bg-surface-subtle overflow-hidden">
      {children}
    </div>
  )
}
