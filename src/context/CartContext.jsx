import { createContext, useContext, useReducer } from 'react'

const CartContext = createContext(null)

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const existing = state.find(i => i.id === action.item.id)
      if (existing) {
        return state.map(i => i.id === action.item.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...state, { ...action.item, quantity: 1, notes: '' }]
    }
    case 'REMOVE':
      return state.filter(i => i.id !== action.id)
    case 'UPDATE_QTY': {
      if (action.quantity <= 0) return state.filter(i => i.id !== action.id)
      return state.map(i => i.id === action.id ? { ...i, quantity: action.quantity } : i)
    }
    case 'UPDATE_NOTES':
      return state.map(i => i.id === action.id ? { ...i, notes: action.notes } : i)
    case 'CLEAR':
      return []
    default:
      return state
  }
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(cartReducer, [])

  const total      = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const itemCount  = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartContext.Provider value={{
      items,
      total,
      itemCount,
      addItem:     (item) => dispatch({ type: 'ADD', item }),
      removeItem:  (id)   => dispatch({ type: 'REMOVE', id }),
      updateQty:   (id, quantity) => dispatch({ type: 'UPDATE_QTY', id, quantity }),
      updateNotes: (id, notes)    => dispatch({ type: 'UPDATE_NOTES', id, notes }),
      clear:       ()     => dispatch({ type: 'CLEAR' })
    }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider')
  return ctx
}
