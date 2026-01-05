"use client"

import { CartItems } from "@/app/types"
import { Button } from "@/components/ui/button"
import { useCartStore } from "@/lib/store"
import { toast } from "sonner"



const AddToCartButton = ({product} : {product: CartItems}) => {

    const {addToCart} = useCartStore()

    const handleAddToCart = () => {
        try {
            addToCart(product);

            toast.success("Add Cart Added")
        } catch (error) {
            toast.error("Error")
            console.log(error);
        }
    }

  return (
    <Button size={"sm"} onClick={handleAddToCart}>AddToCartButton</Button>
  )
}

export default AddToCartButton