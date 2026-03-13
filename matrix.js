(function () {
  var FONT_SIZE = 14;
  var FRAME_INTERVAL = 50; // ms between frames (~20 fps)
  var chars =
    "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン" +
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()[]{}|<>/\\";

  var canvas, ctx, columns, lastTime;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    var cols = Math.floor(canvas.width / FONT_SIZE);
    columns = [];
    for (var i = 0; i < cols; i++) {
      columns[i] = Math.floor(Math.random() * -(canvas.height / FONT_SIZE));
    }
  }

  function draw() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = FONT_SIZE + "px 'Courier New', monospace";

    for (var i = 0; i < columns.length; i++) {
      var ch = chars[Math.floor(Math.random() * chars.length)];
      var x = i * FONT_SIZE;
      var y = columns[i] * FONT_SIZE;

      // Bright white-green head character
      if (columns[i] > 0) {
        ctx.fillStyle = "#afffaf";
        ctx.fillText(ch, x, y);
      }

      // Trailing green characters
      if (columns[i] > 1) {
        ctx.fillStyle = "#00cc44";
        var trailChar = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(trailChar, x, y - FONT_SIZE);
      }

      columns[i]++;

      // Reset column to top with random delay after passing the bottom
      if (y > canvas.height && Math.random() > 0.975) {
        columns[i] = 0;
      }
    }
  }

  function animate(timestamp) {
    requestAnimationFrame(animate);
    if (!lastTime || timestamp - lastTime >= FRAME_INTERVAL) {
      lastTime = timestamp;
      draw();
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    canvas = document.getElementById("matrixCanvas");
    ctx = canvas.getContext("2d");
    resize();
    window.addEventListener("resize", resize);
    requestAnimationFrame(animate);
  });
})();
