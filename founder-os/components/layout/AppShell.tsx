import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#070B14] text-white">

      <Sidebar />

      <main className="ml-72">

        <Header />

        <section className="p-8">

          {children}

        </section>

      </main>

    </div>
  );
}