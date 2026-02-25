'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#09090b] px-6">
      {/* Background decorations */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
        className="absolute top-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-blue-600/10 blur-[120px]"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, delay: 0.5 }}
        className="absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-blue-600/10 blur-[120px]"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <Card className="relative z-10 w-full max-w-md border-white/10 bg-black/40 p-8 backdrop-blur-xl">
          <div className="mb-8 text-center">
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 font-bold italic text-white shadow-[0_0_30px_rgba(37,99,235,0.6)] text-2xl"
            >
              A
            </motion.div>
            <h1 className="text-4xl font-bold tracking-tighter text-white neon-text-blue">
              ADS AUTOPILOT
            </h1>
            <p className="mt-3 text-zinc-400">
              Gerenciamento inteligente com IA e Automático.
            </p>
          </div>

          <div className="space-y-4">
            <Button className="w-full bg-blue-600 text-white hover:bg-blue-700 neon-blue h-12 text-base font-bold">
              Entrar com Google
            </Button>
            <Link href="/dashboard" className="block">
              <Button variant="outline" className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10 h-12">
                Acesso de Gestor
              </Button>
            </Link>
          </div>

          <div className="mt-8 text-center text-[10px] text-zinc-600 uppercase tracking-widest">
            The Future of Traffic Management
          </div>
        </Card>
      </motion.div>
    </main>
  );
}
