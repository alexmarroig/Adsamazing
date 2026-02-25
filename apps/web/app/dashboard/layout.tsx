'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { Navbar } from '@/components/layout/navbar';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full relative bg-[#09090b]">
      <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80]">
        <Sidebar />
      </div>
      <main className="md:pl-72 min-h-screen flex flex-col">
        <Navbar />
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="p-8 flex-1"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
