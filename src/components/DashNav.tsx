import { DASH_NAV_ITEMS } from "./dash-nav-links";
import { Tabs } from "./ui/tabs";

/**
 * The console sidebar: `Tabs` in link mode, stacked. `Tabs` owns `aria-current`, the 44px rows and the ink-on-surface-2
 * active state; the links and their match rule come from `dash-nav-links`, the same source the mobile drawer renders.
 * Shown from `lg` up (the layout hides the column below it); the drawer carries the same items below `lg`.
 */
export function DashNav() {
  return (
    <Tabs
      ariaLabel="Dashboard"
      orientation="vertical"
      items={DASH_NAV_ITEMS.map(({ href, label, match }) => ({ href, label, match }))}
    />
  );
}
