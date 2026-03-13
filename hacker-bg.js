(() => {
  function initHackerBg() {
    if (!document.body) return;
    if (document.getElementById("hacker-bg-canvas")) return;

    // Wrap existing body content so we can layer canvas behind it
    const layer = document.createElement("div");
    layer.id = "site-content-layer";

    while (document.body.firstChild) {
      layer.appendChild(document.body.firstChild);
    }
    document.body.appendChild(layer);

    Object.assign(document.body.style, {
      margin: "0",
      background: "transparent",
      position: "relative",
      minHeight: "100vh",
      overflowX: "hidden"
    });

    Object.assign(layer.style, {
      position: "relative",
      zIndex: "1"
    });

    const canvas = document.createElement("canvas");
    canvas.id = "hacker-bg-canvas";
    Object.assign(canvas.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100vw",
      height: "100vh",
      zIndex: "0",
      pointerEvents: "none"
    });

    document.body.insertBefore(canvas, layer);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const chars =
      "アァカサタナハマヤャラワガザダバパ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$+-*/=%\"'#&_(),.;:?!\\|{}<>[]^~";
    const fontSize = 16;
    let columns = 0;
    let drops = [];
    let dpr = 1;

    function resize() {
      dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = `${fontSize}px monospace`;

      columns = Math.ceil(window.innerWidth / fontSize);
      drops = Array.from({ length: columns }, () => Math.random() * -100);
    }

    function draw() {
      ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      for (let i = 0; i < columns; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        ctx.fillStyle = "#7dffb3";
        ctx.fillText(char, x, y);

        if (y > window.innerHeight && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }

      requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize, { passive: true });
    requestAnimationFrame(draw);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHackerBg, { once: true });
  } else {
    initHackerBg();
  }
})();
