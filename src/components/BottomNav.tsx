import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ArrowDownLeft, ArrowUpRight, Users, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { title: 'Home',     url: '/',           icon: LayoutDashboard, end: true },
  { title: 'Owed Me',  url: '/owed-to-me', icon: ArrowDownLeft },
  { title: 'I Owe',    url: '/i-owe',      icon: ArrowUpRight },
  { title: 'People',   url: '/people',     icon: Users },
  { title: 'Split',    url: '/split-bill', icon: Receipt },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card border-t safe-bottom">
      <div className="flex items-stretch h-16">
        {items.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn('h-5 w-5', isActive && 'stroke-[2.5px]')} />
                <span>{item.title}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
