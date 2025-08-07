"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

export default function HomeHero() {
  const router = useRouter()

  return (
    <section className="relative isolate min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#1e293b] via-[#223051] to-[#1e2436]">
      {/* ------------ Background ornaments ------------ */}
      {/* top-left βγ */}
      <motion.img
        initial={{ opacity: 0, y: -20, x: -20 }}
        animate={{ opacity: 0.5, y: 0, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        src="/images/greek.png"
        alt=""
        className="absolute left-4 top-4 w-16 md:w-20"
      />
      {/* top-right atom */}
      <motion.img
        initial={{ opacity: 0, y: -20, x: 20 }}
        animate={{ opacity: 0.5, y: 0, x: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        src="/images/atom.png"
        alt=""
        className="absolute right-6 top-8 w-20 md:w-24"
      />
      {/* scientists (hidden on xs) */}
      <Image
        src="/images/scientist-girl.png"
        alt=""
        width={120}
        height={120}
        className="hidden sm:block absolute bottom-24 left-8 opacity-60"
      />
      <Image
        src="/images/scientist-boy.png"
        alt=""
        width={140}
        height={140}
        className="hidden sm:block absolute bottom-10 right-8 opacity-60"
      />

      {/* ------------ Main content ------------ */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-3xl px-6 text-center"
      >
        <h1 className="font-extrabold tracking-tight text-white text-[clamp(2.5rem,6vw,4.5rem)]">
          Virtual Lab
        </h1>

        <p className="mt-6 text-slate-200 text-lg md:text-xl leading-relaxed">
          Welcome to the future of scientific learning.<br className="hidden md:block" />
          Access virtual experiments, collaborate with peers, and explore the wonders of science.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            className="bg-blue-600 hover:bg-blue-500 focus-visible:ring-offset-2"
            onClick={() => router.push("/auth/login")}
          >
            Sign In to Lab
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="bg-blue-600 hover:bg-blue-500 focus-visible:ring-offset-2"
            onClick={() => router.push("/auth/signup")}
          >
            Create Account
          </Button>
        </div>
      </motion.div>
    </section>
  )
}
