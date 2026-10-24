import { useEffect, useRef } from "react";

/**
 * A slow field of soft colour behind the home hero.
 * One fullscreen triangle, no dependencies. The loop stops when the hero
 * leaves the viewport or the tab is hidden. Reduced motion never mounts it.
 */
const VERT = `
attribute vec2 a;
void main() {
  gl_Position = vec4(a, 0.0, 1.0);
}
`;

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uBlue;
uniform vec3 uMist;
uniform float uDark;
uniform float uBoost;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float blob(vec2 p, vec2 c, float r) {
  float d = length(p - c) / r;
  return exp(-d * d * 1.7);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 p = vec2((uv.x - 0.38) * aspect, uv.y - 0.42);
  float t = uTime;

  float n = noise(p * 1.05 + vec2(t * 0.045, -t * 0.03));
  float n2 = noise(p * 1.7 - vec2(-t * 0.025, t * 0.04) + 5.2);
  p += (n - 0.5) * 0.28 + (n2 - 0.5) * 0.1;

  vec2 c1 = vec2(0.72 + sin(t * 0.13) * 0.18, 0.02 + cos(t * 0.09) * 0.12);
  vec2 c2 = vec2(-0.28 + cos(t * 0.11) * 0.22, -0.18 + sin(t * 0.08) * 0.16);
  vec2 c3 = vec2(0.18 + sin(t * 0.1 + 2.0) * 0.3, 0.38 + cos(t * 0.12) * 0.14);

  float field = blob(p, c1, 0.72) * 0.9 + blob(p, c2, 0.86) * 0.55 + blob(p, c3, 0.5) * 0.4;
  field = smoothstep(0.06, 0.78, field);

  /* Small text sits on the left. Keep that side nearly clear so muted
     type stays above 4.5:1, and let the colour gather on the right. */
  float calm = smoothstep(0.5, 0.92, uv.x);
  float fade = 1.0 - smoothstep(0.58, 0.96, uv.y);
  field *= calm * fade;

  float blueA = field * mix(0.2, 0.36, uDark) * uBoost;
  float mistA = field * mix(0.1, 0.06, uDark) * uBoost;
  float alpha = clamp(blueA + mistA, 0.0, 0.55);
  float mixAmt = blueA / max(blueA + mistA, 0.0001);
  vec3 color = mix(uMist, uBlue, clamp(mixAmt, 0.0, 1.0));
  /* The canvas is premultiplied. Straight alpha here composites as a white slab. */
  gl_FragColor = vec4(color * alpha, alpha);
}
`;

export function HeroField({ dark }: { dark: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const darkRef = useRef(dark);
  darkRef.current = dark;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      powerPreference: "low-power",
    });
    if (!gl) {
      canvas.style.display = "none";
      return;
    }

    const vertex = compile(gl, gl.VERTEX_SHADER, VERT);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vertex || !fragment) {
      canvas.style.display = "none";
      return;
    }
    const program = gl.createProgram();
    if (!program) {
      canvas.style.display = "none";
      return;
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      canvas.style.display = "none";
      return;
    }
    gl.useProgram(program);
    gl.clearColor(0, 0, 0, 0);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const attrib = gl.getAttribLocation(program, "a");
    gl.enableVertexAttribArray(attrib);
    gl.vertexAttribPointer(attrib, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "uRes");
    const uTime = gl.getUniformLocation(program, "uTime");
    const uBlue = gl.getUniformLocation(program, "uBlue");
    const uMist = gl.getUniformLocation(program, "uMist");
    const uDark = gl.getUniformLocation(program, "uDark");
    const uBoost = gl.getUniformLocation(program, "uBoost");

    const paintColors = () => {
      if (darkRef.current) {
        gl.uniform3f(uBlue, 59 / 255, 130 / 255, 246 / 255);
        gl.uniform3f(uMist, 113 / 255, 113 / 255, 122 / 255);
        gl.uniform1f(uDark, 1);
      } else {
        gl.uniform3f(uBlue, 37 / 255, 99 / 255, 235 / 255);
        gl.uniform3f(uMist, 161 / 255, 161 / 255, 170 / 255);
        gl.uniform1f(uDark, 0);
      }
    };

    const resize = () => {
      const parent = canvas.parentElement;
      const width = parent?.clientWidth || 1;
      const height = parent?.clientHeight || 1;
      const budget = width < 700 ? 420 : 760;
      const scale = Math.min(1, budget / width);
      const pw = Math.max(2, Math.round(width * scale));
      const ph = Math.max(2, Math.round(height * scale));
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      /* Mobile text runs the full width, so the wash stays fainter there. */
      gl.uniform1f(uBoost, width < 700 ? 0.28 : 1);
    };

    let visible = true;
    let raf = 0;
    let last = 0;

    const frame = (now: number) => {
      if (!visible) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(frame);
      const minDelta = (canvas.parentElement?.clientWidth ?? 800) < 700 ? 42 : 33;
      if (now - last < minDelta) return;
      last = now;
      paintColors();
      gl.uniform1f(uTime, now * 0.001);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const kick = () => {
      if (raf || !visible) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };

    let onScreen = true;
    const applyVisibility = () => {
      visible = onScreen && document.visibilityState !== "hidden";
      if (visible) kick();
      else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      paintColors();
      gl.uniform1f(uTime, performance.now() * 0.001);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    });
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);

    const intersection = new IntersectionObserver((entries) => {
      onScreen = entries.some((entry) => entry.isIntersecting);
      applyVisibility();
    });
    intersection.observe(canvas);
    document.addEventListener("visibilitychange", applyVisibility);

    resize();
    paintColors();
    gl.uniform1f(uTime, performance.now() * 0.001);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    applyVisibility();

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", applyVisibility);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return <canvas ref={canvasRef} className="hero-field" />;
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export default HeroField;
