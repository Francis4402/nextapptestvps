import { CartStore } from '@/app/types'
import {create} from 'zustand'
import { devtools, persist } from 'zustand/middleware'


export const useCartStore = create<CartStore>()(
    devtools(
        persist(
            (set, get) => ({
                cart: [],

                addToCart: (product) =>
                    set((state) => {
                        const exists = state.cart.some(
                            (item) => item.id === product.id
                        )

                        if (exists) return state

                        return {
                            cart: [...state.cart, product],
                        }
                    }),

                removeFromCart: (id) =>
                    set((state) => ({
                        cart: state.cart.filter((item) => item.id !== id),
                    })),

                clearCart: () => set({ cart: [] }),

                getTotalItems: () => get().cart.length,

                getItemById: (id) =>
                    get().cart.find((item) => item.id === id),

                getSubTotal: () =>
                    get().cart.reduce(
                        (sum, item) => sum + Number(item.price),
                        0
                    ),


                getTax: () => {
                    const taxRate = 0.05 // 5%
                    return get().getSubTotal() * taxRate
                },

                getShipping: () => (get().cart.length > 0 ? 50 : 0),

                getTotal: () =>
                    get().getSubTotal() +
                    get().getTax() +
                    get().getShipping(),
            }),
            {
                name: "cart",
            }
        )
    )
)