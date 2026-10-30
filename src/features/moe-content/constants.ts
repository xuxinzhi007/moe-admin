/** 养成内容包静态资源根（Vite base /ops/） */
export const MOE_CONTENT_BASE = `${import.meta.env.BASE_URL}pet/moe_content`.replace(/\/$/, '')

/** 统一 pack manifest（avatar + objects） */
export const MOE_CONTENT_MANIFEST_URL = `${MOE_CONTENT_BASE}/manifest.json`

export const MOE_AVATAR_PACK_BASE = `${MOE_CONTENT_BASE}/avatar`
export const MOE_AVATAR_MANIFEST_URL = `${MOE_AVATAR_PACK_BASE}/manifest.json`

export const MOE_FURNITURE_PACK_BASE = `${MOE_CONTENT_BASE}/furniture`
export const MOE_FURNITURE_MANIFEST_URL = `${MOE_FURNITURE_PACK_BASE}/manifest.json`

export const MOE_DECOR_PACK_BASE = `${MOE_CONTENT_BASE}/decor`
export const MOE_DECOR_MANIFEST_URL = `${MOE_DECOR_PACK_BASE}/manifest.json`
