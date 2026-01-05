"use client"

import Link from "next/link"
import { ShoppingBag } from "lucide-react"
import { signOut, useSession } from "next-auth/react"

import { Button } from "@/components/ui/button"
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCartStore } from "@/lib/store"

const Navbar = () => {
    const { data: session } = useSession()
    const totalItems = useCartStore((state) => state.getTotalItems())

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur">
            <div className="container mx-auto flex h-16 items-center justify-between px-5 md:px-0">
                {/* Logo */}
                <Link href="/" className="md:text-xl text-sm font-bold">
                    Next CRUD
                </Link>

                {/* Right section */}
                <div className="flex items-center md:gap-10 gap-2">
                    {/* Cart */}
                    <Link
                        href="/cart"
                        className="relative flex items-center gap-1"
                    >
                        <ShoppingBag className="h-5 w-5" />
                        <span className="text-sm">Cart</span>

                        {totalItems > 0 && (
                            <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-white">
                                {totalItems}
                            </span>
                        )}
                    </Link>

                    {/* Auth */}
                    {session?.user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Avatar className="cursor-pointer">
                                    <AvatarImage
                                        src={session.user.image ?? ""}
                                    />
                                    <AvatarFallback>
                                        {session.user.name?.charAt(0) ?? "U"}
                                    </AvatarFallback>
                                </Avatar>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    onClick={() => signOut()}
                                >
                                    Logout
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Link href="/login">
                            <Button size="sm">Login</Button>
                        </Link>
                    )}
                </div>
            </div>
        </header>
    )
}

export default Navbar
