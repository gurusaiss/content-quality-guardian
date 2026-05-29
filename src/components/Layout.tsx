import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";

export const Layout = ({ children }: { children: React.ReactNode }) => {
    const location = useLocation();
    const { user, signOut } = useAuth();

    const isActive = (path: string) => location.pathname === path;

    const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
    const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

    const navLinks = [
        { to: "/audit", label: "Audit" },
        { to: "/brief", label: "Brief Generator" },
        { to: "/dashboard", label: "Dashboard" },
        { to: "/calendar", label: "Calendar" },
    ];

    return (
        <div className="min-h-screen flex flex-col bg-background font-sans">
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-16 items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
                            <Sparkles className="h-6 w-6" />
                            <span>ContentIQ</span>
                        </Link>
                        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                            {navLinks.map(({ to, label }) => (
                                <Link
                                    key={to}
                                    to={to}
                                    className={`transition-colors hover:text-primary ${isActive(to) ? 'text-primary font-semibold' : 'text-muted-foreground'}`}
                                >
                                    {label}
                                </Link>
                            ))}
                        </nav>
                    </div>
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <Link to="/audit">
                            <Button size="sm" className="hidden md:flex">
                                Run Audit
                            </Button>
                        </Link>
                        {user && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={avatarUrl} />
                                            <AvatarFallback className="text-xs">{displayName[0]?.toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <div className="px-2 py-1.5 text-sm font-medium truncate">{displayName}</div>
                                    <div className="px-2 pb-1.5 text-xs text-muted-foreground truncate">{user.email}</div>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => signOut()} className="text-destructive gap-2">
                                        <LogOut className="h-4 w-4" />
                                        Sign Out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-1">
                {children}
            </main>

            <footer className="border-t py-6 md:py-0">
                <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
                    <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                        Built for modern content teams.
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <Link to="#" className="hover:underline">Terms</Link>
                        <Link to="#" className="hover:underline">Privacy</Link>
                        <Link to="#" className="hover:underline">Contact</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
};
