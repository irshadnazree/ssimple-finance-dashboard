import { Link } from '@tanstack/react-router'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from './ui/navigation-menu'
import { cn } from '../lib/utils'

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-6">
        <div className="mr-6">
          <h1 className="text-sm font-semibold tracking-tight text-foreground/80 font-mono">$ ssimple-finance</h1>
        </div>
        
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <Link to="/">
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                  Dashboard
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            
            <NavigationMenuItem>
              <Link to="/transactions">
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                  Transactions
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            
            
            <NavigationMenuItem>
              <Link to="/reports">
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                  Reports
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </header>
  )
}
