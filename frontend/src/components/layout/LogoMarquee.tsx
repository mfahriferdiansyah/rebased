import { motion } from "framer-motion";

// Easy to add new logos - just add a new object to this array!
// Place logo images in public/logo-marquee/ directory
const PARTNER_LOGOS = [
  { name: "Metamask", filename: "metamask.png" },
  { name: "Farcaster", filename: "farcaster.png" },
  { name: "Pyth", filename: "pyth.png" },
  { name: "Uniswap", filename: "uniswap.png" },
];

export function LogoMarquee() {
  // Repeat logos enough times to ensure they fill more than the screen width
  const repeatedLogos = [...PARTNER_LOGOS, ...PARTNER_LOGOS, ...PARTNER_LOGOS];

  return (
    <div className="w-full overflow-hidden bg-white border-b border-gray-200 py-6">
      <motion.div
        className="flex gap-8 whitespace-nowrap"
        animate={{
          x: ["0%", "-50%"],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear",
        }}
        whileHover={{
          animationPlayState: "paused",
        }}
      >
        {/* First set of logos (3x repeated) */}
        {repeatedLogos.map((logo, index) => (
          <div
            key={`logo-1-${index}`}
            className="inline-flex items-center justify-center min-w-max"
          >
            <img
              src={`/logo-marquee/${logo.filename}`}
              alt={logo.name}
              className="h-10 w-auto object-contain grayscale opacity-60 hover:opacity-100 transition-opacity duration-300"
            />
          </div>
        ))}

        {/* Duplicate set for seamless loop (3x repeated) */}
        {repeatedLogos.map((logo, index) => (
          <div
            key={`logo-2-${index}`}
            className="inline-flex items-center justify-center min-w-max"
          >
            <img
              src={`/logo-marquee/${logo.filename}`}
              alt={logo.name}
              className="h-10 w-auto object-contain grayscale opacity-60 hover:opacity-100 transition-opacity duration-300"
            />
          </div>
        ))}
      </motion.div>
    </div>
  );
}
