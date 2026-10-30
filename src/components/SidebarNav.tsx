import { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  NAV_BY_WORKSPACE,
  detectWorkspace,
  type NavEntry,
  type NavGroup,
  type NavItem,
} from '../config/workspaceNav'
import { AdminIcon } from './AdminIcon'

function itemActive(pathname: string, to: string, end?: boolean) {
  if (end || to === '/biz') {
    return pathname === to || pathname === `${to}/`
  }
  return pathname === to || pathname.startsWith(`${to}/`)
}

function groupHasActive(group: NavGroup, pathname: string) {
  return group.children.some((c) => itemActive(pathname, c.to, c.end))
}

export function SidebarNav() {
  const location = useLocation()
  const pathname = location.pathname
  const workspace = detectWorkspace(pathname)
  const tree = NAV_BY_WORKSPACE[workspace]

  const initialOpen = useMemo(() => {
    const init: Record<string, boolean> = {}
    for (const entry of tree) {
      if (entry.kind === 'group') {
        init[entry.id] = entry.defaultOpen === true || groupHasActive(entry, pathname)
      }
    }
    return init
  }, [pathname, tree])

  const [openMap, setOpenMap] = useState<Record<string, boolean>>(initialOpen)

  useEffect(() => {
    const init: Record<string, boolean> = {}
    for (const entry of NAV_BY_WORKSPACE[workspace]) {
      if (entry.kind === 'group') {
        init[entry.id] = entry.defaultOpen === true
      }
    }
    setOpenMap(init)
  }, [workspace])

  useEffect(() => {
    setOpenMap((prev) => {
      const next = { ...prev }
      for (const entry of tree) {
        if (entry.kind === 'group' && groupHasActive(entry, pathname)) {
          next[entry.id] = true
        }
      }
      return next
    })
  }, [pathname, tree])

  function toggleGroup(id: string) {
    setOpenMap((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function renderItem(item: NavItem, topLevel = false) {
    const active = itemActive(pathname, item.to, item.end)
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end === true}
        className={`nav-item${topLevel ? ' nav-item-top' : ' nav-item-child'}${active ? ' active' : ''}`}
        title={item.title}
      >
        {item.icon ? (
          <span className="nav-item-icon" aria-hidden>
            <AdminIcon name={item.icon} />
          </span>
        ) : topLevel ? null : (
          <span className="nav-item-dot" aria-hidden />
        )}
        <span className="nav-item-label">{item.label}</span>
      </NavLink>
    )
  }

  function renderEntry(entry: NavEntry) {
    if (entry.kind === 'item') {
      return renderItem(entry, true)
    }
    const open = openMap[entry.id] ?? false
    const activeInGroup = groupHasActive(entry, pathname)
    return (
      <div
        key={entry.id}
        className={`nav-group${open ? ' is-open' : ''}${activeInGroup ? ' has-active' : ''}`}
      >
        <button
          type="button"
          className="nav-group-head"
          onClick={() => toggleGroup(entry.id)}
          aria-expanded={open}
        >
          <span className="nav-group-chevron" aria-hidden>
            <AdminIcon name={open ? 'chevronDown' : 'chevronRight'} />
          </span>
          {entry.icon ? (
            <span className="nav-group-icon" aria-hidden>
              <AdminIcon name={entry.icon} />
            </span>
          ) : null}
          <span className="nav-group-text">
            <span className="nav-group-title">{entry.label}</span>
            {entry.caption ? <span className="nav-group-caption">{entry.caption}</span> : null}
          </span>
        </button>
        {open ? <div className="nav-group-body">{entry.children.map((child) => renderItem(child))}</div> : null}
      </div>
    )
  }

  return <nav className="sidebar-nav">{tree.map(renderEntry)}</nav>
}
