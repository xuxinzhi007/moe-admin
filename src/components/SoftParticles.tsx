import { useEffect, useRef } from 'react'

type SoftParticlesProps = {
  className?: string
  /** 粒子数量，登录页建议 48–72 */
  count?: number
  /** 不透明度上限 0–1 */
  opacity?: number
}

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  a: number
}

/**
 * 极轻氛围粒子（优先 WebGL points，失败回退 Canvas2D）。
 * 尊重 prefers-reduced-motion；后台标签页自动暂停。
 */
export function SoftParticles({ className = '', count = 56, opacity = 0.55 }: SoftParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      canvas.style.display = 'none'
      return
    }

    let disposed = false
    let raf = 0
    let running = true

    const onVisibility = () => {
      running = document.visibilityState === 'visible'
      if (running) tick()
    }
    document.addEventListener('visibilitychange', onVisibility)

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const particles: Particle[] = []

    function resize() {
      const parent = canvas!.parentElement
      const w = parent?.clientWidth || window.innerWidth
      const h = parent?.clientHeight || window.innerHeight
      canvas!.width = Math.floor(w * dpr)
      canvas!.height = Math.floor(h * dpr)
      canvas!.style.width = `${w}px`
      canvas!.style.height = `${h}px`
      return { w: canvas!.width, h: canvas!.height }
    }

    function seed(w: number, h: number) {
      particles.length = 0
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.18 * dpr,
          vy: (Math.random() - 0.5) * 0.18 * dpr,
          r: (1.2 + Math.random() * 2.4) * dpr,
          a: 0.25 + Math.random() * 0.55,
        })
      }
    }

    let { w, h } = resize()
    seed(w, h)

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
      powerPreference: 'low-power',
    })

    let drawFrame: () => void

    if (gl) {
      const vs = `
        attribute vec2 a_pos;
        attribute float a_size;
        attribute float a_alpha;
        uniform vec2 u_res;
        varying float v_alpha;
        void main() {
          vec2 clip = (a_pos / u_res) * 2.0 - 1.0;
          gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
          gl_PointSize = a_size;
          v_alpha = a_alpha;
        }
      `
      const fs = `
        precision mediump float;
        varying float v_alpha;
        uniform float u_opacity;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          float soft = smoothstep(0.5, 0.08, d);
          // violet → cyan tint
          vec3 col = mix(vec3(0.42, 0.37, 0.76), vec3(0.20, 0.83, 0.78), soft * 0.55);
          gl_FragColor = vec4(col, soft * v_alpha * u_opacity);
        }
      `

      function compile(type: number, src: string) {
        const s = gl!.createShader(type)!
        gl!.shaderSource(s, src)
        gl!.compileShader(s)
        return s
      }

      const prog = gl.createProgram()!
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs))
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs))
      gl.linkProgram(prog)
      gl.useProgram(prog)

      const aPos = gl.getAttribLocation(prog, 'a_pos')
      const aSize = gl.getAttribLocation(prog, 'a_size')
      const aAlpha = gl.getAttribLocation(prog, 'a_alpha')
      const uRes = gl.getUniformLocation(prog, 'u_res')
      const uOpacity = gl.getUniformLocation(prog, 'u_opacity')

      const bufPos = gl.createBuffer()!
      const bufSize = gl.createBuffer()!
      const bufAlpha = gl.createBuffer()!

      const pos = new Float32Array(count * 2)
      const size = new Float32Array(count)
      const alpha = new Float32Array(count)

      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
      gl.clearColor(0, 0, 0, 0)

      drawFrame = () => {
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i]
          p.x += p.vx
          p.y += p.vy
          if (p.x < 0 || p.x > w) p.vx *= -1
          if (p.y < 0 || p.y > h) p.vy *= -1
          p.x = Math.max(0, Math.min(w, p.x))
          p.y = Math.max(0, Math.min(h, p.y))
          pos[i * 2] = p.x
          pos[i * 2 + 1] = p.y
          size[i] = p.r * 3.2
          alpha[i] = p.a
        }

        gl!.viewport(0, 0, w, h)
        gl!.clear(gl!.COLOR_BUFFER_BIT)
        gl!.uniform2f(uRes, w, h)
        gl!.uniform1f(uOpacity, opacity)

        gl!.bindBuffer(gl!.ARRAY_BUFFER, bufPos)
        gl!.bufferData(gl!.ARRAY_BUFFER, pos, gl!.DYNAMIC_DRAW)
        gl!.enableVertexAttribArray(aPos)
        gl!.vertexAttribPointer(aPos, 2, gl!.FLOAT, false, 0, 0)

        gl!.bindBuffer(gl!.ARRAY_BUFFER, bufSize)
        gl!.bufferData(gl!.ARRAY_BUFFER, size, gl!.DYNAMIC_DRAW)
        gl!.enableVertexAttribArray(aSize)
        gl!.vertexAttribPointer(aSize, 1, gl!.FLOAT, false, 0, 0)

        gl!.bindBuffer(gl!.ARRAY_BUFFER, bufAlpha)
        gl!.bufferData(gl!.ARRAY_BUFFER, alpha, gl!.DYNAMIC_DRAW)
        gl!.enableVertexAttribArray(aAlpha)
        gl!.vertexAttribPointer(aAlpha, 1, gl!.FLOAT, false, 0, 0)

        gl!.drawArrays(gl!.POINTS, 0, count)
      }
    } else {
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      drawFrame = () => {
        ctx.clearRect(0, 0, w, h)
        for (const p of particles) {
          p.x += p.vx
          p.y += p.vy
          if (p.x < 0 || p.x > w) p.vx *= -1
          if (p.y < 0 || p.y > h) p.vy *= -1
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3)
          g.addColorStop(0, `rgba(107,95,193,${p.a * opacity})`)
          g.addColorStop(1, 'rgba(52,211,200,0)')
          ctx.fillStyle = g
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    function tick() {
      if (disposed || !running) return
      drawFrame()
      raf = window.requestAnimationFrame(tick)
    }

    const onResize = () => {
      ;({ w, h } = resize())
      seed(w, h)
    }
    window.addEventListener('resize', onResize)
    tick()

    return () => {
      disposed = true
      running = false
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [count, opacity])

  return (
    <canvas
      ref={canvasRef}
      className={`soft-particles${className ? ` ${className}` : ''}`}
      aria-hidden
    />
  )
}
