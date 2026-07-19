'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { Logo } from '@/components/Logo';
import { ChatIcon, KeyIcon, WrenchIcon, DocIcon, CheckIcon } from '@/components/Icons';

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
          <div className="skeleton skeleton-sm" style={{ width: 96, height: 36 }} />
        ) : user ? (
          <div className="nav-user">
            <span className="email" title={user.email ?? ''}>{user.email}</span>
            <button className="btn btn-ghost btn-sm" onClick={logout}>
              Chiqish
            </button>
          </div>
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

/** Desktop uchun chap tomondagi doimiy sidebar. */
export function SiteSidebar({ active, onSelectTab }: NavProps) {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      {user && (
        <div className="sidebar-user">
          <div className="sidebar-avatar">{(user.email ?? '?').charAt(0).toUpperCase()}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-email" title={user.email ?? ''}>{user.email}</div>
            <button className="btn btn-ghost btn-sm" onClick={logout}>Chiqish</button>
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
