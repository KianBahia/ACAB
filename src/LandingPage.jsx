function LandingPage({ onLaunch }) {
  return (
    <div className="relative min-h-screen w-full overflow-visible bg-[#ff4201] flex flex-col">
      {/* Title at top */}
      <div className="relative z-30 pt-8 md:pt-12">
        <h1 className="text-8xl md:text-9xl font-black text-black text-center tracking-tight drop-shadow-lg">
          ACAB
        </h1>
      </div>

      {/* Spiky Hexagon at center */}
      <div className="flex-1 flex items-center justify-center relative z-10" style={{ overflow: 'visible' }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-sun-pulse">
            <SpikyHexagon />
          </div>
        </div>
      </div>

      {/* Launch button at bottom - Persona 5 inspired */}
      <div className="relative z-30 pb-8 md:pb-12 flex justify-center">
        <div className="relative inline-block" style={{ transform: 'rotate(-2deg)' }}>
          {/* Black shadow layer - furthest back */}
          <div
            className="absolute bg-black"
            style={{
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              transform: 'translate(16px, 16px)',
              clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
              WebkitClipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
              zIndex: 1,
              opacity: 0.6,
            }}
          />
          {/* White shadow layer - middle */}
          <div
            className="absolute bg-white"
            style={{
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              transform: 'translate(8px, 8px)',
              clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
              WebkitClipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
              zIndex: 2,
            }}
          />
          {/* Main button - on top */}
          <button
            onClick={onLaunch}
            className="relative px-16 py-5 text-3xl font-black text-white bg-black cursor-pointer transition-all duration-200 hover:scale-105 active:scale-100"
            style={{
              clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
              WebkitClipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
              border: 'none',
              outline: 'none',
              zIndex: 3,
              position: 'relative',
            }}
          >
            <span className="relative z-10 tracking-wider">LAUNCH</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function SpikyHexagon() {
  const spikeCount = 20;
  const spikes = [];
  const hexagonSize = 80; // Size of the hexagon
  
  // Create long pointy triangular spikes that extend across the page
  for (let i = 0; i < spikeCount; i++) {
    const angle = (i / spikeCount) * 360;
    // Make spikes varied in length - shorter average with more variation
    const length = 120 + Math.random() * 280; // Range: 120-400px (shorter average, more varied)
    const baseWidth = 15 + Math.random() * 10; // Wider base (15-25px)
    
    spikes.push(
      <div
        key={i}
        className="absolute top-1/2 left-1/2"
        style={{
          transform: `translate(-50%, -50%) rotate(${angle}deg)`,
          transformOrigin: "center center",
          width: 0,
          height: 0,
          overflow: "visible",
        }}
      >
        {/* Triangular spike - wide base at top (near hexagon), pointy tip at bottom (far from hexagon) */}
        <div
          style={{
            width: `${baseWidth}px`,
            height: `${length}px`,
            backgroundColor: "black",
            clipPath: "polygon(50% 100%, 0% 0%, 100% 0%)",
            WebkitClipPath: "polygon(50% 100%, 0% 0%, 100% 0%)",
            transformOrigin: "top center",
            marginLeft: `-${baseWidth / 2}px`,
            display: "block",
          }}
        />
      </div>
    );
  }
  
  return (
    <div className="relative" style={{ width: '100vw', height: '100vh', maxWidth: '100vw', maxHeight: '100vh' }}>
      {/* Central black hexagon */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black"
        style={{
          width: `${hexagonSize * 2}px`,
          height: `${hexagonSize * 2}px`,
          clipPath: "polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)",
          zIndex: 10,
        }}
      />
      {/* Spikes */}
      {spikes}
    </div>
  );
}

export default LandingPage;
