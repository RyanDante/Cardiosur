/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { ChevronRight } from "lucide-react";
import { useState, useRef } from "react";

// Import your images
import heroImage from "../../assets/images/hero.jpeg";
import familyImage from "../../assets/images/family.jpeg";
import heartImage from "../../assets/images/heart.jpeg";
import kidsImage from "../../assets/images/kids.jpeg";
import hopeImage from "../../assets/images/hope.jpeg";

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement | null>(null);

  const handleDragEnd = (_: any, info: any) => {
    setIsDragging(false);
    if (info.offset.x > 150) {
      // Smooth slide to completion
      if (sliderRef.current) {
        sliderRef.current.animate({ x: 300 }, { duration: 0.3, easing: "ease-out" });
      }
      setTimeout(() => onComplete(), 300);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#f8fff9] flex flex-col relative overflow-hidden">
      
      {/* Top Section - Text + Slider */}
      <div className="relative z-20 px-8 pt-12 pb-6">
        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 leading-tight">
            Not Sure How<br />
            Your Heart's<br />
            Doing Today?
          </h1>
        </div>

        {/* Slider */}
        <div className="relative">
          <div className="relative bg-emerald-100 rounded-full h-14 sm:h-16 overflow-hidden shadow-inner">
            
            {/* Background text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-emerald-600 font-medium text-sm sm:text-base tracking-wide">
                Run a Quick Scan
              </span>
            </div>

            {/* Draggable button */}
            <motion.div
              ref={sliderRef}
              drag="x"
              dragConstraints={{ left: 0, right: 250 }}
              dragElastic={0.2}
              dragMomentum={false}
              onDragStart={() => setIsDragging(true)}
              onDragEnd={handleDragEnd}
              className="absolute left-0 top-0 h-14 sm:h-16 w-14 sm:w-16 bg-emerald-500 rounded-full shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <ChevronRight className="text-white" size={24} strokeWidth={3} />
            </motion.div>

            {/* Sliding effect overlay */}
            <motion.div 
              drag="x"
              dragConstraints={{ left: 0, right: 250 }}
              dragElastic={0.2}
              dragMomentum={false}
              className="absolute left-0 top-0 h-full bg-emerald-200/50 pointer-events-none"
              style={{ width: "0%" }}
              onDrag={(e, info) => {
                const progress = Math.min(info.offset.x / 250, 1) * 100;
                (e.target as HTMLElement).style.width = `${progress}%`;
              }}
              onDragEnd={() => {
                (document.querySelector('.bg-emerald-200\\/50') as HTMLElement).style.width = '0%';
              }}
            />
          </div>

          <p className="text-center text-slate-500 text-xs mt-3">
            Swipe right to begin your heart health check
          </p>
        </div>
      </div>

      {/* Bottom Section - Images */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          {/* Family photo - top left */}
          <motion.div
            animate={{ 
              y: [0, -15, 0],
              rotate: [-2, 2, -2]
            }}
            transition={{ 
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-4 left-4 translate-x-10 sm:left-8 w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden shadow-2xl border-4 border-white"
          >
            <img 
              src={familyImage} 
              alt="Family" 
              className="w-full h-full object-cover"
            />
          </motion.div>

          {/* Couple photo - top right */}
          <motion.div
            animate={{ 
              y: [0, 20, 0],
              rotate: [3, -3, 3]
            }}
            transition={{ 
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5
            }}
            className="absolute top-1 right-8 sm:right-8 w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden shadow-2xl border-4 border-white"
          >
            <img 
              src={kidsImage} 
              alt="Kids" 
              className="w-full h-full object-cover"
            />
          </motion.div>

          {/* Heart icon - middle right */}
          <motion.div
            animate={{ 
              y: [0, -20, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
            className="absolute top-1/3 translate-x-40 sm:translate-x-12 w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden shadow-2xl bg-red-500 flex items-center justify-center border-4 border-white"
          >
            <img 
              src={heartImage} 
              alt="Heart" 
              className="w-full h-full sm:w-20 sm:h-20 object-contain scale-200"
            />
          </motion.div>

          {/* Logo/Medical icon - bottom left */}
          <motion.div
            animate={{ 
              y: [0, 15, 0],
              rotate: [-3, 3, -3]
            }}
            transition={{ 
              duration: 4.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.5
            }}
            className="absolute translate-x-60 sm:translate-x-12 translate-y-12 bottom-24 sm:bottom-48 left-4 sm:left-12 w-24 h-24 sm:w-20 sm:h-20 rounded-full overflow-hidden shadow-2xl bg-red-600 flex items-center justify-center border-4 border-white"
          >
            <img 
              src={hopeImage} 
              alt="Hope" 
              className="w-full h-full sm:w-12 sm:h-12 object-contain scale-320"
            />
          </motion.div>

          {/* Hero image - bottom center large */}
          <motion.div
            animate={{ 
              y: [0, -10, 0],
            }}
            transition={{ 
              duration: 3.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.3
            }}
            className="absolute bottom-2 sm:bottom-32 left-1/2 -translate-x-40 w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden shadow-2xl border-4 border-white z-10"
          >
            <img 
              src={heroImage} 
              alt="Hero" 
              className="w-full h-full object-cover"
            />
          </motion.div>
        </div>
      </div>

    </div>
  );
}