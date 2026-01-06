"use client"

import { CartItems } from "@/app/types"
import { Button } from "@/components/ui/button"
import { useCartStore } from "@/lib/store"
import { toast } from "sonner"



const AddToCartButton = ({product} : {product: CartItems}) => {

    const {addToCart, cart} = useCartStore()

    const handleAddToCart = () => {
        try {
            const existingItem = cart.find(item => item.id === product.id)

            if (product.quantity <= 0) {
                toast.error("This product is out of stock")
                return
            }

            if (existingItem && existingItem.cartQty >= existingItem.quantity) {
                toast.error(`Maximum quantity (${existingItem.quantity}) reached for this item`)
                return
            }

            if (existingItem && existingItem.cartQty < existingItem.quantity) {
                toast.success(`Increased quantity to ${existingItem.cartQty + 1}`)
            } else {
                // First time adding to cart
                toast.success("Product added to cart")
            }

            addToCart(product)

        } catch (error) {
            toast.error("Failed to add item to cart")
            console.log(error);
        }
    }

    const isOutOfStock = product.quantity <= 0
    const existingItem = cart.find(item => item.id === product.id)
    const isMaxQuantity = existingItem && existingItem.cartQty >= existingItem.quantity

  return (
    <Button 
            size={"sm"} 
            onClick={handleAddToCart}
            disabled={isOutOfStock || isMaxQuantity}
            className={isOutOfStock ? "opacity-50 cursor-not-allowed" : ""}
        >
            {isOutOfStock ? "Out of Stock" : 
             isMaxQuantity ? "Max Quantity" : "Add to Cart"}
      </Button>
  )
}

export default AddToCartButton