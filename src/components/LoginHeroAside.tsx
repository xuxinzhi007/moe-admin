import { useEffect, useMemo, useState } from 'react'

export type LoginHeroSlide = {
  src: string
  alt: string
}

/**
 * 自动扫描 `src/assets/login_image/` 下的图片。
 * 后续只需往该目录添加 .jpg / .png / .webp，保存后刷新即可（多图会轮播）。
 */
const heroModules = import.meta.glob<{ default: string }>(
  '../assets/login_image/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}',
  { eager: true },
)

function loadHeroSlides(): LoginHeroSlide[] {
  return Object.entries(heroModules)
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([path, mod]) => {
      const file = path.split('/').pop() || 'hero'
      const name = file.replace(/\.[^.]+$/, '')
      return { src: mod.default, alt: `Moe · ${name}` }
    })
}

const ROTATE_MS = 7000

type LoginHeroAsideProps = {
  /** 一般不用传；仅测试时可覆盖自动扫描结果 */
  slides?: LoginHeroSlide[]
}

/** 登录页左侧：立绘 + 轻文案；多图时自动交叉淡入 */
export function LoginHeroAside({ slides }: LoginHeroAsideProps) {
  const autoSlides = useMemo(() => loadHeroSlides(), [])
  const list = slides && slides.length > 0 ? slides : autoSlides
  const [index, setIndex] = useState(0)
  const multi = list.length > 1

  useEffect(() => {
    setIndex(0)
  }, [list.length])

  useEffect(() => {
    if (!multi) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % list.length)
    }, ROTATE_MS)
    return () => window.clearInterval(id)
  }, [multi, list.length])

  if (list.length === 0) {
    return (
      <aside className="login-aside login-aside--empty">
        <div className="login-aside-copy">
          <p className="login-aside-kicker">Moe Social</p>
          <h2>Moe Admin</h2>
          <p className="login-aside-lead">请将立绘放入 src/assets/login_image/</p>
        </div>
      </aside>
    )
  }

  return (
    <aside className="login-aside">
      <div className="login-aside-media" aria-hidden>
        {list.map((slide, i) => (
          <img
            key={slide.src}
            src={slide.src}
            alt=""
            className={`login-aside-img${i === index ? ' is-active' : ''}`}
            draggable={false}
          />
        ))}
        <div className="login-aside-veil" />
      </div>

      <div className="login-aside-copy">
        <p className="login-aside-kicker">Moe Social</p>
        <h2>Moe Admin</h2>
        <p className="login-aside-lead">专属管理后台 · 运营 / AI / 运维</p>
        <ul className="login-aside-list">
          <li>用户与内容运营</li>
          <li>本机 / 云端 API</li>
          <li>构建发布与监控</li>
        </ul>
        {multi ? (
          <div className="login-aside-dots" role="tablist" aria-label="立绘切换">
            {list.map((slide, i) => (
              <button
                key={slide.src}
                type="button"
                role="tab"
                aria-selected={i === index}
                className={`login-aside-dot${i === index ? ' is-active' : ''}`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </aside>
  )
}
