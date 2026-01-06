"use client"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useCartStore } from "@/lib/store"
import { Minus, Plus, Trash2 } from "lucide-react"

export default function CartPage() {
    const {
        cart,
        increaseQty,
        decreaseQty,
        removeFromCart,
        clearCart,
        getSubTotal,
        getTax,
        getShipping,
        getTotal,
    } = useCartStore()

    if (cart.length === 0) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <p className="text-muted-foreground text-lg">
                    Your cart is empty 🛒
                </p>
            </div>
        )
    }

    return (
        <div className="container mx-auto max-w-4xl py-10">
            <h1 className="text-3xl font-bold mb-6">Shopping Cart</h1>

            <div className="grid gap-6">
                {/* Cart Items */}
                <Card>
                    <CardHeader>
                        <CardTitle>Items</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {cart.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between border-b pb-4"
                            >
                                {/* Left */}
                                <div className="space-y-1">
                                    <p className="font-medium">
                                        {item.title}{" "}
                                        <span className="text-muted-foreground">
                                            × {item.cartQty}
                                        </span>
                                    </p>

                                    <p className="text-sm text-muted-foreground">
                                        ৳ {Number(item.price).toLocaleString()} each
                                    </p>

                                    <p className="text-sm font-semibold">
                                        Line total: ৳{" "}
                                        {(Number(item.price) * item.cartQty).toLocaleString()}
                                    </p>

                                    {/* Quantity controls */}
                                    <div className="flex items-center gap-2 mt-2">
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            onClick={() => decreaseQty(item.id)}
                                            disabled={item.cartQty <= 1}
                                        >
                                            <Minus className="h-4 w-4" />
                                        </Button>

                                        <span className="w-8 text-center font-medium">
                                            {item.cartQty}
                                        </span>

                                        <Button
                                            size="icon"
                                            variant="outline"
                                            onClick={() => increaseQty(item.id)}
                                            disabled={item.cartQty >= item.quantity}
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Right */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeFromCart(item.id)}
                                >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>

                    <CardFooter>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={clearCart}
                        >
                            Clear Cart
                        </Button>
                    </CardFooter>
                </Card>

                {/* Summary */}
                <Card>
                    <CardHeader>
                        <CardTitle>Order Summary</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-3">
                        <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>৳ {getSubTotal().toLocaleString()}</span>
                        </div>

                        <div className="flex justify-between">
                            <span>Tax</span>
                            <span>৳ {getTax().toLocaleString()}</span>
                        </div>

                        <div className="flex justify-between">
                            <span>Shipping</span>
                            <span>৳ {getShipping().toLocaleString()}</span>
                        </div>

                        <Separator />

                        <div className="flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span>৳ {getTotal().toLocaleString()}</span>
                        </div>
                    </CardContent>

                    <CardFooter>
                        <Button className="w-full">
                            Proceed to Checkout
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}
