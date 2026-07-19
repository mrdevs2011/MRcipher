'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Logo } from '@/components/Logo';
import { ChatIcon, KeyIcon, WrenchIcon, DocIcon, CheckIcon, PanelToggleIcon, MoreIcon } from '@/components/Icons';

/**
 * Butun ilova bo'ylab bir xil header, sidebar, bottom-tabbar va footer.
 * Shu tufayli foydalanuvchi qaysi sahifada bo'lishidan qat'iy nazar
 * (bosh sahifa, /verify, /doc) doim MRcipher ichida ekanini his qiladi.
 */

export type NavKey = 'translator' | 'keys' | 'docs' | 'guide' | 'verify';

type NavItem = {
  key: NavKey;
  label: string;
  href: string;
  icon: (props: { size?: number }) => JSX.Element;
  /** true bo'lsa, "/" sahifasida ushbu item ichki tab sifatida ishlaydi */
  isDashboardTab?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { key: 'translator', label: 'Tarjimon', href: '/', icon: ChatIcon, isDashboardTab: true },
  { key: 'keys', label: 'API kalitlar', href: '/?tab=keys', icon: KeyIcon, isDashboardTab: true },
  { key: 'docs', label: 'Endpointlar', href: '/?tab=docs', icon: WrenchIcon, isDashboardTab: true },
  { key: 'guide', label: 'Qo\u2018llanma', href: '/doc', icon: DocIcon },
  { key: 'verify', label: 'Fayl tekshirish', href: '/verify', icon: CheckIcon },
];

const SIDEBAR_COLLAPSE_KEY = 'mrcipher:sidebar-collapsed';

/**
 * Sidebar yig'ilgan/yozilgan holatini localStorage'da saqlaydi, shu tufayli
 * qaysi sahifaga o'tilmasin (dashboard, /verify, /doc) holat bir xil qoladi.
 */
function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === '1');
    } catch {
      // localStorage yo'q bo'lsa (masalan private mode), sukut bo'yicha ochiq qoladi.
    }
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        // e'tiborsiz qoldiriladi
      }
      return next;
    });
  }

  return { collapsed, toggle };
}

/**
 * Header'dagi "..." hisob menyusi. Hozircha faqat "Chiqish" bor, lekin
 * kelajakda shu yerga boshqa hisob bilan bog'liq amallar (masalan, profil,
 * sozlamalar) qo'shish uchun ochiq joy sifatida mo'ljallangan.
 */
function AccountMenu({ email, onLogout }: { email: string | null; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div className="navbar-menu" ref={menuRef}>
      <button
        type="button"
        className="navbar-menu-btn"
        onClick={() => setOpen((prev) => !prev)}
        title="Hisob menyusi"
        aria-label="Hisob menyusi"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreIcon size={20} />
      </button>

      {open && (
        <div className="navbar-menu-dropdown" role="menu">
          {email && (
            <div className="navbar-menu-email" title={email}>
              {email}
            </div>
          )}
          <button
            type="button"
            className="navbar-menu-item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            Chiqish
          </button>
        </div>
      )}
    </div>
  );
}

/** Barcha sahifalarda bir xil ko'rinadigan yuqori navbar. */
export function SiteHeader() {
  const { user, loading, signInWithGoogle, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-inner container">
        <Link href="/" className="brand">
          <Logo size={28} />
          <span className="brand-text">MRcipher</span>
        </Link>

        {loading ? (
          <div className="skeleton skeleton-sm" style={{ width: 36, height: 36 }} />
        ) : user ? (
          <AccountMenu email={user.email} onLogout={logout} />
        ) : (
          <button className="btn btn-primary btn-sm" onClick={signInWithGoogle}>
            Google bilan kirish
          </button>
        )}
      </div>
    </nav>
  );
}

type NavProps = {
  /** Hozir faol bo'lgan nav item (shu sahifa qaysi bo'limni ko'rsatayotgani) */
  active: NavKey;
  /**
   * "/" sahifasidagi ichki tablarni almashtirish uchun (translator/keys/docs).
   * Berilmasa, bu itemlar ham oddiy link sifatida "/" ga o'tadi.
   */
  onSelectTab?: (key: NavKey) => void;
};

/** Desktop uchun chap tomondagi doimiy sidebar. Instagram/YouTube kabi yig'ilib, faqat ikonka qolishi mumkin. */
export function SiteSidebar({ active, onSelectTab }: NavProps) {
  const { user } = useAuth();
  const { collapsed, toggle } = useSidebarCollapsed();

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <button
        type="button"
        className="sidebar-toggle"
        onClick={toggle}
        title={collapsed ? "Sidebar'ni kengaytirish" : "Sidebar'ni yig'ish"}
        aria-label={collapsed ? "Sidebar'ni kengaytirish" : "Sidebar'ni yig'ish"}
      >
        <PanelToggleIcon size={18} />
      </button>

      {user && (
        <div className="sidebar-user">
          <div className="sidebar-avatar">{(user.email ?? '?').charAt(0).toUpperCase()}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-email" title={user.email ?? ''}>{user.email}</div>
          </div>
        </div>
      )}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.key;
          if (item.isDashboardTab && onSelectTab) {
            return (
              <button
                key={item.key}
                type="button"
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                onClick={() => onSelectTab(item.key)}
                title={item.label}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          }
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
              title={item.label}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

/** Mobil uchun pastki tab-bar (sidebar bilan bir xil itemlar). */
export function SiteBottomNav({ active, onSelectTab }: NavProps) {
  return (
    <nav className="bottom-tabbar">
      {NAV_ITEMS.map((item) => {
        const isActive = active === item.key;
        if (item.isDashboardTab && onSelectTab) {
          return (
            <button
              key={item.key}
              type="button"
              className={`bottom-tab ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTab(item.key)}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        }
        return (
          <Link
            key={item.key}
            href={item.href}
            className={`bottom-tab ${isActive ? 'active' : ''}`}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Barcha sahifalarda bir xil footer matni. */
export function SiteFooter({ variant = 'default' }: { variant?: 'default' | 'app' }) {
  return (
    <footer className={`footer ${variant === 'app' ? 'app-footer' : ''}`}>
      <p className="text-muted">MRcipher — AES-256-GCM Encryption-as-a-Service</p>
    </footer>
  );
}
